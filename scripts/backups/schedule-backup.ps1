# PowerShell script to schedule database backups
# Run this script as Administrator to create the scheduled task

$taskName = "HelixCRM-DatabaseBackup"
$scriptPath = "D:\Projects-In-Hand\helixcrm\scripts\backups\backup-db.sh"
$bashPath = "C:\Program Files\Git\bin\bash.exe"  # Git Bash path

# Create scheduled task for daily backup at 2 AM
$action = New-ScheduledTaskAction -Execute $bashPath -Argument "-c `"$scriptPath production`""
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Description "Daily database backup for HelixCRM"

Write-Host "✅ Scheduled task '$taskName' created successfully"
Write-Host "Backup will run daily at 2:00 AM"