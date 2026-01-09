$t=Get-Content backend/src/server.ts -Raw
$open=($t.ToCharArray() | Where-Object {$_ -eq '{'} | Measure-Object).Count
$close=($t.ToCharArray() | Where-Object {$_ -eq '}'} | Measure-Object).Count
Write-Output "Open: $open Close: $close Balance: $($open - $close)"
