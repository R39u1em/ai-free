' AI Free — скрытый запуск без консоли (Windows / Black Screen Mode).
' Двойной клик по этому файлу запускает `npm start` в полностью невидимом процессе:
' ни окна cmd, ни иконки на панели задач от терминала.
Set WshShell = CreateObject("WScript.Shell")
' 0 = скрытое окно, False = не ждать завершения
WshShell.Run "cmd /c cd /d """ & CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName) & """ && npm start", 0, False
Set WshShell = Nothing
