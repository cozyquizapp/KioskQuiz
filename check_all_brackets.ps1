$t=Get-Content backend/src/server.ts -Raw
$openP=($t.ToCharArray() | Where-Object {$_ -eq '('} | Measure-Object).Count
$closeP=($t.ToCharArray() | Where-Object {$_ -eq ')'} | Measure-Object).Count
$openC=($t.ToCharArray() | Where-Object {$_ -eq '{'} | Measure-Object).Count
$closeC=($t.ToCharArray() | Where-Object {$_ -eq '}'} | Measure-Object).Count
Write-Output "Parentheses () - Open: $openP Close: $closeP Balance: $($openP - $closeP)"
Write-Output "Curly braces {} - Open: $openC Close: $closeC Balance: $($openC - $closeC)"
