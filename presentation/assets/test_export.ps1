$ErrorActionPreference = "Stop"

$pptxPath = "C:\Users\jiten\.gemini\antigravity\scratch\FileMind\FileMind_Project_Presentation.pptx"
$pdfPath  = "C:\Users\jiten\.gemini\antigravity\scratch\FileMind\FileMind_Project_Presentation.pdf"
$slidesDir = "C:\Users\jiten\.gemini\antigravity\scratch\FileMind\presentation_assets\slide_previews"

$ppt = New-Object -ComObject PowerPoint.Application

try {
    $pres = $ppt.Presentations.Open($pptxPath, [Microsoft.Office.Core.MsoTriState]::msoFalse, [Microsoft.Office.Core.MsoTriState]::msoFalse, [Microsoft.Office.Core.MsoTriState]::msoFalse)
    
    # Export slide images first
    for ($i = 1; $i -le $pres.Slides.Count; $i++) {
        $slide = $pres.Slides.Item($i)
        $slideImgPath = Join-Path $slidesDir ("slide_{0:D2}.png" -f $i)
        $slide.Export($slideImgPath, "PNG", 1920, 1080)
    }
    Write-Host "Slide images exported!"

    # Save as PDF
    Write-Host "Saving PDF..."
    $pres.SaveCopyAs($pdfPath, 32)
    Write-Host "PDF Saved!"

    $pres.Close()
}
catch {
    Write-Host "Error: $_"
}
finally {
    $ppt.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($ppt) | Out-Null
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
}
