# HelixCRM Development Script
param([string]$Command = "help")

function Show-Help {
    Write-Host "HelixCRM Development Commands" -ForegroundColor Cyan
    Write-Host "=============================" -ForegroundColor Cyan
    Write-Host "  .\dev.ps1 setup      - Install dependencies"
    Write-Host "  .\dev.ps1 dev        - Start development"
    Write-Host "  .\dev.ps1 docker-up  - Start Docker services"
    Write-Host "  .\dev.ps1 docker-down - Stop Docker services"
    Write-Host "  .\dev.ps1 clean      - Clean build artifacts"
    Write-Host "  .\dev.ps1 db-migrate - Run database migrations"
    Write-Host "  .\dev.ps1 db-seed    - Seed database with test data"
    Write-Host "  .\dev.ps1 help       - Show this help"
}

function Invoke-Setup {
    Write-Host "Installing dependencies..." -ForegroundColor Cyan
    npm install
    Write-Host "Dependencies installed!" -ForegroundColor Green
}

function Invoke-DockerUp {
    Write-Host "Starting Docker services..." -ForegroundColor Cyan
    docker-compose -f docker/docker-compose.yml up -d
    Write-Host "✓ PostgreSQL: localhost:5432" -ForegroundColor Green
    Write-Host "✓ Redis: localhost:6379" -ForegroundColor Green
    Write-Host "Waiting for services to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
}

function Invoke-DockerDown {
    Write-Host "Stopping Docker services..." -ForegroundColor Cyan
    docker-compose -f docker/docker-compose.yml down
    Write-Host "Docker services stopped!" -ForegroundColor Green
}

function Invoke-Dev {
    Write-Host "Starting development..." -ForegroundColor Cyan
    Write-Host "Backend: http://localhost:3000" -ForegroundColor Yellow
    Write-Host "Frontend: http://localhost:3001 (coming soon)" -ForegroundColor Yellow
    Write-Host "Database: localhost:5432" -ForegroundColor Yellow
    Write-Host "Redis: localhost:6379" -ForegroundColor Yellow
    npm run dev
}

function Invoke-Clean {
    Write-Host "Cleaning build artifacts..." -ForegroundColor Cyan
    Remove-Item -Recurse -Force node_modules, dist, build, .turbo -ErrorAction SilentlyContinue
    Write-Host "Clean complete!" -ForegroundColor Green
}

function Invoke-DbMigrate {
    Write-Host "Running database migrations..." -ForegroundColor Cyan
    if (Test-Path apps\api) {
        cd apps\api
        npx prisma migrate dev --name init
        cd ..\..
        Write-Host "Database migrations complete!" -ForegroundColor Green
    } else {
        Write-Host "API directory not found. Run setup first." -ForegroundColor Red
    }
}

# Execute command
switch ($Command) {
    "setup" { Invoke-Setup }
    "dev" { Invoke-Dev }
    "docker-up" { Invoke-DockerUp }
    "docker-down" { Invoke-DockerDown }
    "clean" { Invoke-Clean }
    "db-migrate" { Invoke-DbMigrate }
    "help" { Show-Help }
    default {
        Write-Host "Unknown command: $Command" -ForegroundColor Red
        Show-Help
    }
}
