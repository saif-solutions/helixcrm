# HelixCRM Development Script
param([string]$Command = 'help')

if ($Command -eq 'docker-up') {
    Write-Host 'Starting Docker services...' -ForegroundColor Cyan
    docker-compose -f docker/docker-compose.yml up -d
    Write-Host '✓ PostgreSQL: localhost:5432' -ForegroundColor Green
    Write-Host '✓ Redis: localhost:6379' -ForegroundColor Green
}
elseif ($Command -eq 'docker-down') {
    Write-Host 'Stopping Docker services...' -ForegroundColor Cyan
    docker-compose -f docker/docker-compose.yml down
    Write-Host 'Docker services stopped!' -ForegroundColor Green
}
else {
    Write-Host 'HelixCRM Development Commands' -ForegroundColor Cyan
    Write-Host '  .\dev.ps1 docker-up  - Start Docker services'
    Write-Host '  .\dev.ps1 docker-down - Stop Docker services'
    Write-Host '  .\dev.ps1 help       - Show this help'
}
