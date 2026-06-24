package main

import (
    "encoding/json"
    "fmt"
    "html/template"
    "log"
    "net/http"
    "io"
    "strings"
)

type Artist struct {
    ID           int      `json:"id"`
    Image        string   `json:"image"`
    Name         string   `json:"name"`
    Members      []string `json:"members"`
    CreationDate int      `json:"creationDate"`
    FirstAlbum   string   `json:"firstAlbum"`
    Locations    string   `json:"locations"`   // URL vers ses lieux de concerts
    ConcertDates string   `json:"concertDates"` // URL vers ses dates
    Relations    string   `json:"relations"`   // URL vers la relation
}

type Relation struct {
	ID             int                 `json:"id"`
	DatesLocations map[string][]string `json:"datesLocations"`
}

type ArtistDetail struct {
	Artist   Artist
	Relation Relation
}

func fetchJSON(url string, target interface{}) error {
    resp, err := http.Get(url)
    if err != nil {
        return fmt.Errorf("erreur requête vers %s : %w", url, err)
    }
    defer resp.Body.Close()

    body, err := io.ReadAll(resp.Body)
    if err != nil {
        return fmt.Errorf("erreur lecture reponse : %w", err)
    }

    return json.Unmarshal(body, target)
}

func handleIndex(w http.ResponseWriter, r *http.Request) {

    if r.URL.Path != "/" {
        http.NotFound(w, r)
        return
    }
    var artists []Artist
    err := fetchJSON("https://groupietrackers.herokuapp.com/api/artists", &artists)
    if err != nil {
        http.Error(w, "Impossible de récupérer les artistes", http.StatusInternalServerError)
        log.Println("Erreur fetch artistes:", err)
        return
    }

    tmpl, err := template.ParseFiles("templates/index.html")
    if err != nil {
        http.Error(w, "Erreur template", http.StatusInternalServerError)
        log.Print("Erreur template:", err)
        return
    }
    tmpl.Execute(w, nil)
}
var cachedArtists []Artist
var cacheLoaded bool

func handleArtistsAPI(w http.ResponseWriter, r *http.Request) {
  if cacheLoaded {
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(cachedArtists)
        return
  }
    fetchJSON("https://groupietrackers.herokuapp.com/api/artists", &cachedArtists)
    cacheLoaded = true
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(cachedArtists)
}

func handleArtistDetail(w http.ResponseWriter, r *http.Request) {
    idStr := strings.TrimPrefix(r.URL.Path, "/api/artist/")
    if idStr == "" {
        http.Error(w, "ID manquant", http.StatusBadRequest)
        return
    }

    var artists []Artist
    err := fetchJSON("https://groupietrackers.herokuapp.com/api/artists", &artists)
    if err != nil {
        http.Error(w, "Erreur recuperation artistes", http.StatusInternalServerError)
        return
    }

    var found Artist
    var foundOK bool
    for _, a := range artists {
        if fmt.Sprintf("%d", a.ID) == idStr {
            found = a 
            foundOK = true
            break
        }
    }

    if !foundOK {
        http.Error(w, "Artiste introuvable", http.StatusNotFound)
        return
    }

    var relation Relation 
    err = fetchJSON(found.Relations, &relation)
    if err != nil {
        log.Println("Erreur fetch relation pour artiste", idStr, ";", err)
        relation = Relation{ID: found.ID, DatesLocations: map[string][]string{}}
    }

    detail := ArtistDetail{
        Artist:      found,
        Relation: relation,
    }
w.Header().Set("Content-Type", "application/json")
json.NewEncoder(w).Encode(detail)
}

func main() {

    fmt.Println("chargement des artistes...")
    err := fetchJSON("https://groupietrackers.herokuapp.com/api/artists", &cachedArtists)
	if err != nil {
		log.Println("erre ur chargement artistes:", err)
		cacheLoaded = false
	}
    cacheLoaded = true
    fmt.Println("Artistes chargés !")
    http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))

    http.HandleFunc("/", handleIndex)               
    http.HandleFunc("/api/artists", handleArtistsAPI)
    http.HandleFunc("/api/artist/", handleArtistDetail)

    fmt.Println("Serveur lancé sur http://localhost:8280")
    log.Fatal(http.ListenAndServe(":8280", nil)) 
}