package files

import(
    "database/sql"
    "io"
    "mime/multipart"
    "os"
    "time"
    "log"
    "path/filepath"
    _"github.com/mattn/go-sqlite3"
    "bpeecs.nchu.edu.tw/function"
)

type Files struct{
    db *sql.DB
    Upload_time uint64
    Client_name string
    Server_name string
    Path string
    Hash string
}

func New() *Files{
    return new(Files)
}

func (f *Files) Connect(path string) *sql.DB{
    db, err := sql.Open("sqlite3", path)
    f.db = db
    if err != nil{
        log.Println(err)
        return nil
    }
    return f.db
}

func (f *Files) NewFile(fh *multipart.FileHeader) error{
    filePath := "./assets/upload/"
    fileExt  := filepath.Ext(fh.Filename)

    // Generate new file name on server (do not use client name)
    fileName := function.RandomString(10)
    for fileExists(filePath + fileName + fileExt){
        fileName = function.RandomString(10)
    }

    newFile, err := os.OpenFile(filePath + string(fileName) + fileExt, os.O_WRONLY | os.O_CREATE, 0666)
    defer newFile.Close()
    if err != nil{
        log.Println(err, "files.go NewFile() os.OpenFile() failed")
        return err
    }

    oriFile, _ := fh.Open()
    defer oriFile.Close()

    _, err = io.Copy(newFile, oriFile)
    if err != nil{
        log.Println(err, "files.go NewFile() io.Copy() failed")
        return err
    }

    stmt, _ := f.db.Prepare("INSERT INTO files(upload_time, client_name, server_name, path) values(?, ?, ?, ?)")
    now := time.Now().Unix()

    f.Upload_time = uint64(now)
    f.Client_name = fh.Filename
    f.Server_name = fileName
    f.Path = "/assets/upload/" + fileName + fileExt

    _, err = stmt.Exec(now, f.Client_name, f.Server_name, f.Path)
    if err != nil{
        log.Println(err, "files.go NewFile() stmt.Exec() failed")
        return err
    }

    return nil
}

// Delete by server_name
func (f *Files) Del(server_name string) error{
    rows := f.db.QueryRow("SELECT path FROM files WHERE server_name = ?", server_name)

    var path string
    err := rows.Scan(&path)
    if err != nil{
        log.Println(err)
        return err
    }

    return f.DelByPathList([]string{path})
}

// Delete files by path list
func (f *Files) DelByPathList(pathList []string) error{
    for _, v := range pathList{
        err := os.Remove("." + v)
        if err != nil{
            log.Println(err, "files.go os.Remove()")
        }
        stmt, _ := f.db.Prepare("DELETE FROM files WHERE path=?")
        _, err = stmt.Exec(v)
        if err != nil{
            log.Println(err, "files.go Remove() stmt.Exec() failed")
            return err
        }
    }
    return nil
}

// Delete files do not be used anymore
func (f *Files) AutoDel(){
    rows, err := f.db.Query(`
        SELECT path FROM files
        WHERE article_id is null and upload_time < ?` ,
        time.Now().Unix() - 12*60*60)

    if err != nil{
        log.Println(err, "files.go Automremove() db.Query failed")
        return
    }

    path := ""
    pathList := []string{}
    for rows.Next(){
        rows.Scan(&path)
        pathList = append(pathList, path)
    }
    rows.Close()

    f.DelByPathList(pathList)
}

func fileExists(filename string) bool {
    info, err := os.Stat(filename)
    if os.IsNotExist(err) {
        return false
    }
    return !info.IsDir()
}
