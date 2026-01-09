$t=Get-Content backend/src/server.ts -Raw
$pos=159835
$lines=1
for($i=0;$i -lt $pos; $i++){
  if($t[$i] -eq [char]10){$lines++}
}
Write-Output "Char 159835 is on line $lines"
