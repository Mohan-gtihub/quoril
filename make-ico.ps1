Add-Type -AssemblyName System.Drawing

$src = 'C:\Users\Asus\Documents\code\blitzit-clone\public\icon.png'
$dst = 'C:\Users\Asus\Documents\code\blitzit-clone\public\icon.ico'

$bmp = New-Object System.Drawing.Bitmap([System.Drawing.Image]::FromFile($src), 256, 256)
$ms = New-Object System.IO.MemoryStream
$bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
$imgData = $ms.ToArray()
$ms.Dispose()

$fs = New-Object System.IO.FileStream($dst, [System.IO.FileMode]::Create)
$bw = New-Object System.IO.BinaryWriter($fs)

# ICO header (6 bytes)
$bw.Write([uint16]0)   # reserved
$bw.Write([uint16]1)   # type = icon
$bw.Write([uint16]1)   # image count

# Directory entry (16 bytes)
$bw.Write([byte]0)     # width  (0 means 256)
$bw.Write([byte]0)     # height (0 means 256)
$bw.Write([byte]0)     # color palette
$bw.Write([byte]0)     # reserved
$bw.Write([uint16]1)   # planes
$bw.Write([uint16]32)  # bits per pixel
$bw.Write([uint32]$imgData.Length)
$bw.Write([uint32]22)  # data offset = 6 + 16

# PNG data
$bw.Write($imgData)
$bw.Flush()
$bw.Close()
$fs.Close()
$bmp.Dispose()

Write-Host "icon.ico created at $dst ($($imgData.Length) bytes)"
