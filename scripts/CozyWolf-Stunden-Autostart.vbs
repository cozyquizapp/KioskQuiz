' ============================================================================
' CozyWolf Stunden - ECHTES Login-Autostart (optional, DU installierst es selbst)
' ============================================================================
' Startet bei jeder Windows-Anmeldung UNSICHTBAR und schreibt das Desktop-HTML
' alle 15 Min neu. Die offene HTML-Seite laedt sich alle 10 Min selbst neu und
' zeigt die Stunden so live steigen - ohne offenes Konsolenfenster.
'
' SO INSTALLIERST DU ES (einmalig):
'   1. Win+R druecken, "shell:startup" eintippen, Enter  -> Autostart-Ordner
'   2. DIESE Datei dorthin KOPIEREN.
'   Fertig. Ab dem naechsten Login laeuft die Aktualisierung im Hintergrund.
'
' WIEDER ENTFERNEN:
'   Die Kopie aus dem Autostart-Ordner (shell:startup) loeschen.
' ============================================================================
Set sh = CreateObject("WScript.Shell")
sh.Run """C:\Program Files\nodejs\node.exe"" ""C:\Users\hornu\Desktop\kioskquiz\scripts\hours-counter.mjs"" --watch=15", 0, False
