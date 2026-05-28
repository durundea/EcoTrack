# EcoTrack Backend Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-shaped `EcoTrack-Backend` that replaces the frontend mock adapter for authentication and inventory workflows with a real .NET 8 API backed by PostgreSQL.

**Architecture:** Implement a layered modular monolith in a sibling `EcoTrack-Backend` folder using `Api`, `Application`, `Domain`, and `Infrastructure` projects. Keep the first phase limited to `Auth` and `Inventory`, but structure the code so later `Collection`, `Segregation`, `Recycling`, and `Dashboard` modules can be added without reshaping the solution.

**Tech Stack:** .NET 8, ASP.NET Core Web API, Entity Framework Core, Npgsql, PostgreSQL, JWT bearer auth, FluentValidation, Swagger, xUnit, FluentAssertions, Microsoft.AspNetCore.Mvc.Testing, Testcontainers for PostgreSQL-backed integration tests.

---

## Scope and Commit Policy

- This plan covers one backend subsystem bundle: solution foundation, auth, inventory CRUD, pricing rules, and sales approval workflow.
- The backend lives in a separate sibling folder: `../EcoTrack-Backend` relative to the frontend repository root.
- Commit after each task to keep the backend history reviewable and easy to roll back.

## File Structure and Responsibilities

Solution and repo scaffolding:
- Create: `../EcoTrack-Backend/.gitignore`
  - Ignore build output, IDE files, local secrets, and test result artifacts.
- Create: `../EcoTrack-Backend/EcoTrack-Backend.sln`
  - Solution root for API, class libraries, and test projects.

API layer:
- Create: `../EcoTrack-Backend/src/EcoTrack.Api/EcoTrack.Api.csproj`
  - API host and HTTP dependencies.
- Create: `../EcoTrack-Backend/src/EcoTrack.Api/Program.cs`
  - Host setup, DI wiring, auth, Swagger, and middleware pipeline.
- Create: `../EcoTrack-Backend/src/EcoTrack.Api/Controllers/HealthController.cs`
  - Health endpoint used by the first integration test.
- Create: `../EcoTrack-Backend/src/EcoTrack.Api/Controllers/AuthController.cs`
  - Login and current-user endpoints.
- Create: `../EcoTrack-Backend/src/EcoTrack.Api/Controllers/InventoryController.cs`
  - Inventory item CRUD and price update endpoints.
- Create: `../EcoTrack-Backend/src/EcoTrack.Api/Controllers/SalesController.cs`
  - Sales lifecycle endpoints.
- Create: `../EcoTrack-Backend/src/EcoTrack.Api/Middleware/ApiExceptionMiddleware.cs`
  - Centralized exception-to-response mapping.
- Create: `../EcoTrack-Backend/src/EcoTrack.Api/Contracts/Common/ApiErrorResponse.cs`
  - Stable API error payload.
- Create: `../EcoTrack-Backend/src/EcoTrack.Api/appsettings.json`
  - Base config, logging, JWT section, and connection string keys.
- Create: `../EcoTrack-Backend/src/EcoTrack.Api/appsettings.Development.json`
  - Local development overrides.

Application layer:
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/EcoTrack.Application.csproj`
  - Use-case and validation project.
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Auth/Contracts/LoginRequest.cs`
  - Login request DTO.
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Auth/Contracts/AuthResponse.cs`
  - Auth response DTO.
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Auth/Contracts/CurrentUserResponse.cs`
  - `/me` response DTO.
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Auth/Login/LoginRequestValidator.cs`
  - Login validation.
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Auth/Login/LoginService.cs`
  - Credential validation and token issuance orchestration.
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Auth/Interfaces/IJwtTokenGenerator.cs`
  - JWT abstraction.
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Auth/Interfaces/IPasswordHasher.cs`
  - Password hashing abstraction.
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Common/Exceptions/NotFoundException.cs`
  - Missing resource exception.
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Common/Exceptions/ConflictException.cs`
  - Workflow conflict exception.
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Common/Exceptions/ForbiddenException.cs`
  - Authorization exception.
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Common/Interfaces/IApplicationDbContext.cs`
  - EF-facing interface for app services.
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Common/Interfaces/ICurrentUserContext.cs`
  - Current user abstraction for app services.
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Inventory/Contracts/InventoryItemResponse.cs`
  - Inventory read DTO.
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Inventory/Contracts/CreateInventoryItemRequest.cs`
  - Inventory create DTO.
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Inventory/Contracts/UpdateInventoryItemRequest.cs`
  - Inventory update DTO.
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Inventory/Contracts/UpdateInventoryPriceRequest.cs`
  - Price update DTO.
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Inventory/Contracts/SaleRecordResponse.cs`
  - Sale read DTO.
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Inventory/Contracts/CreateSaleRequest.cs`
  - Sale draft DTO.
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Inventory/Contracts/UpdateSaleRequest.cs`
  - Sale update DTO.
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Inventory/Validators/CreateInventoryItemRequestValidator.cs`
  - Inventory create validation.
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Inventory/Validators/UpdateInventoryItemRequestValidator.cs`
  - Inventory update validation.
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Inventory/Validators/UpdateInventoryPriceRequestValidator.cs`
  - Price validation.
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Inventory/Validators/CreateSaleRequestValidator.cs`
  - Sale create validation.
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Inventory/Validators/UpdateSaleRequestValidator.cs`
  - Sale update validation.
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Inventory/InventoryService.cs`
  - Inventory CRUD and price update orchestration.
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Inventory/SalesService.cs`
  - Sale lifecycle orchestration.

Domain layer:
- Create: `../EcoTrack-Backend/src/EcoTrack.Domain/EcoTrack.Domain.csproj`
  - Core domain project.
- Create: `../EcoTrack-Backend/src/EcoTrack.Domain/Common/Entity.cs`
  - Simple base entity with identity.
- Create: `../EcoTrack-Backend/src/EcoTrack.Domain/Auth/User.cs`
  - User aggregate root.
- Create: `../EcoTrack-Backend/src/EcoTrack.Domain/Auth/UserRole.cs`
  - User role enum.
- Create: `../EcoTrack-Backend/src/EcoTrack.Domain/Inventory/InventoryItem.cs`
  - Inventory aggregate root.
- Create: `../EcoTrack-Backend/src/EcoTrack.Domain/Inventory/InventoryCategory.cs`
  - Inventory category enum.
- Create: `../EcoTrack-Backend/src/EcoTrack.Domain/Inventory/SaleRecord.cs`
  - Sale aggregate with transition methods.
- Create: `../EcoTrack-Backend/src/EcoTrack.Domain/Inventory/SaleApprovalStatus.cs`
  - Sale status enum.

Infrastructure layer:
- Create: `../EcoTrack-Backend/src/EcoTrack.Infrastructure/EcoTrack.Infrastructure.csproj`
  - EF Core, PostgreSQL, and security implementations.
- Create: `../EcoTrack-Backend/src/EcoTrack.Infrastructure/Persistence/AppDbContext.cs`
  - EF Core DbContext.
- Create: `../EcoTrack-Backend/src/EcoTrack.Infrastructure/Persistence/Configurations/UserConfiguration.cs`
  - User entity mapping.
- Create: `../EcoTrack-Backend/src/EcoTrack.Infrastructure/Persistence/Configurations/InventoryItemConfiguration.cs`
  - Inventory entity mapping.
- Create: `../EcoTrack-Backend/src/EcoTrack.Infrastructure/Persistence/Configurations/SaleRecordConfiguration.cs`
  - Sale entity mapping.
- Create: `../EcoTrack-Backend/src/EcoTrack.Infrastructure/Persistence/Seed/DevelopmentDataSeeder.cs`
  - Seed development users and inventory data.
- Create: `../EcoTrack-Backend/src/EcoTrack.Infrastructure/Security/JwtOptions.cs`
  - Strongly typed JWT settings.
- Create: `../EcoTrack-Backend/src/EcoTrack.Infrastructure/Security/JwtTokenGenerator.cs`
  - JWT creation implementation.
- Create: `../EcoTrack-Backend/src/EcoTrack.Infrastructure/Security/PasswordHasher.cs`
  - ASP.NET Core password hashing wrapper.
- Create: `../EcoTrack-Backend/src/EcoTrack.Infrastructure/DependencyInjection.cs`
  - Infrastructure DI registration.

Tests:
- Create: `../EcoTrack-Backend/tests/EcoTrack.UnitTests/EcoTrack.UnitTests.csproj`
  - Domain and application-level tests.
- Create: `../EcoTrack-Backend/tests/EcoTrack.UnitTests/Inventory/SaleRecordTests.cs`
  - Sale lifecycle and revenue tests.
- Create: `../EcoTrack-Backend/tests/EcoTrack.UnitTests/Inventory/InventoryItemTests.cs`
  - Price update rule tests.
- Create: `../EcoTrack-Backend/tests/EcoTrack.IntegrationTests/EcoTrack.IntegrationTests.csproj`
  - API and persistence integration tests.
- Create: `../EcoTrack-Backend/tests/EcoTrack.IntegrationTests/Infrastructure/IntegrationTestWebAppFactory.cs`
  - Test host with PostgreSQL container.
- Create: `../EcoTrack-Backend/tests/EcoTrack.IntegrationTests/HealthEndpointTests.cs`
  - Initial health smoke test.
- Create: `../EcoTrack-Backend/tests/EcoTrack.IntegrationTests/Auth/AuthEndpointsTests.cs`
  - Login and `/me` endpoint tests.
- Create: `../EcoTrack-Backend/tests/EcoTrack.IntegrationTests/Inventory/InventoryEndpointsTests.cs`
  - Inventory CRUD and price endpoint tests.
- Create: `../EcoTrack-Backend/tests/EcoTrack.IntegrationTests/Inventory/SalesEndpointsTests.cs`
  - Sales workflow tests.

Documentation:
- Create: `../EcoTrack-Backend/README.md`
  - Local setup, migration, run, and test commands.

### Task 1: Bootstrap Solution and Health Endpoint

**Files:**
- Create: `../EcoTrack-Backend/.gitignore`
- Create: `../EcoTrack-Backend/EcoTrack-Backend.sln`
- Create: `../EcoTrack-Backend/src/EcoTrack.Api/EcoTrack.Api.csproj`
- Create: `../EcoTrack-Backend/src/EcoTrack.Api/Program.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Api/Controllers/HealthController.cs`
- Create: `../EcoTrack-Backend/tests/EcoTrack.IntegrationTests/EcoTrack.IntegrationTests.csproj`
- Create: `../EcoTrack-Backend/tests/EcoTrack.IntegrationTests/HealthEndpointTests.cs`

- [ ] **Step 1: Write the failing health endpoint integration test**

```csharp
using System.Net;
using FluentAssertions;

namespace EcoTrack.IntegrationTests;

public class HealthEndpointTests : IClassFixture<IntegrationTestWebAppFactory>
{
    private readonly HttpClient _client;

    public HealthEndpointTests(IntegrationTestWebAppFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetHealth_ReturnsOk()
    {
        var response = await _client.GetAsync("/api/health");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("healthy");
    }
}
```

- [ ] **Step 2: Run the test to verify the backend does not exist yet**

Run: `Set-Location ..; dotnet test .\EcoTrack-Backend\tests\EcoTrack.IntegrationTests\EcoTrack.IntegrationTests.csproj --filter "FullyQualifiedName~HealthEndpointTests"`
Expected: FAIL because `EcoTrack-Backend` and its projects have not been created yet.

- [ ] **Step 3: Scaffold the solution, repo, and project references**

```powershell
Set-Location ..
New-Item -ItemType Directory -Path .\EcoTrack-Backend\src -Force | Out-Null
New-Item -ItemType Directory -Path .\EcoTrack-Backend\tests -Force | Out-Null
Set-Location .\EcoTrack-Backend
git init
dotnet new sln -n EcoTrack-Backend
dotnet new webapi -n EcoTrack.Api -o .\src\EcoTrack.Api --use-controllers
dotnet new xunit -n EcoTrack.IntegrationTests -o .\tests\EcoTrack.IntegrationTests
dotnet sln .\EcoTrack-Backend.sln add .\src\EcoTrack.Api\EcoTrack.Api.csproj
dotnet sln .\EcoTrack-Backend.sln add .\tests\EcoTrack.IntegrationTests\EcoTrack.IntegrationTests.csproj
dotnet add .\tests\EcoTrack.IntegrationTests\EcoTrack.IntegrationTests.csproj reference .\src\EcoTrack.Api\EcoTrack.Api.csproj
dotnet add .\tests\EcoTrack.IntegrationTests\EcoTrack.IntegrationTests.csproj package FluentAssertions
dotnet add .\tests\EcoTrack.IntegrationTests\EcoTrack.IntegrationTests.csproj package Microsoft.AspNetCore.Mvc.Testing
```

```gitignore
bin/
obj/
.vs/
.vscode/
TestResults/
*.user
*.suo
appsettings.Local.json
```

- [ ] **Step 4: Add the minimal API host, test factory, and health controller**

```csharp
// ../EcoTrack-Backend/src/EcoTrack.Api/Program.cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();
app.MapControllers();

app.Run();

public partial class Program;
```

```csharp
// ../EcoTrack-Backend/src/EcoTrack.Api/Controllers/HealthController.cs
using Microsoft.AspNetCore.Mvc;

namespace EcoTrack.Api.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new { status = "healthy" });
    }
}
```

```csharp
// ../EcoTrack-Backend/tests/EcoTrack.IntegrationTests/Infrastructure/IntegrationTestWebAppFactory.cs
using Microsoft.AspNetCore.Mvc.Testing;

namespace EcoTrack.IntegrationTests;

public class IntegrationTestWebAppFactory : WebApplicationFactory<Program>
{
}
```

- [ ] **Step 5: Run the health endpoint test again**

Run: `Set-Location ..\EcoTrack-Backend; dotnet test .\tests\EcoTrack.IntegrationTests\EcoTrack.IntegrationTests.csproj --filter "FullyQualifiedName~HealthEndpointTests"`
Expected: PASS with the health endpoint returning `200 OK`.

- [ ] **Step 6: Commit the bootstrap**

```powershell
Set-Location ..\EcoTrack-Backend
git add .
git commit -m "chore: bootstrap backend solution and health endpoint"
```

### Task 2: Add Domain Model and Unit Tests for Core Rules

**Files:**
- Create: `../EcoTrack-Backend/src/EcoTrack.Domain/EcoTrack.Domain.csproj`
- Create: `../EcoTrack-Backend/src/EcoTrack.Domain/Common/Entity.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Domain/Auth/User.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Domain/Auth/UserRole.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Domain/Inventory/InventoryItem.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Domain/Inventory/InventoryCategory.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Domain/Inventory/SaleApprovalStatus.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Domain/Inventory/SaleRecord.cs`
- Create: `../EcoTrack-Backend/tests/EcoTrack.UnitTests/EcoTrack.UnitTests.csproj`
- Create: `../EcoTrack-Backend/tests/EcoTrack.UnitTests/Inventory/SaleRecordTests.cs`
- Create: `../EcoTrack-Backend/tests/EcoTrack.UnitTests/Inventory/InventoryItemTests.cs`

- [ ] **Step 1: Write the failing unit tests for sale lifecycle and pricing rules**

```csharp
using EcoTrack.Domain.Auth;
using EcoTrack.Domain.Inventory;
using FluentAssertions;

namespace EcoTrack.UnitTests.Inventory;

public class SaleRecordTests
{
    [Fact]
    public void SubmitForApproval_WhenStatusIsDraft_ChangesStatusToPendingApproval()
    {
        var sale = SaleRecord.CreateDraft(Guid.NewGuid(), Guid.NewGuid(), 2, 120m, DateTime.UtcNow);

        sale.SubmitForApproval(Guid.NewGuid(), UserRole.Collector);

        sale.ApprovalStatus.Should().Be(SaleApprovalStatus.PendingApproval);
    }

    [Fact]
    public void Approve_WhenStatusIsPendingApproval_StoresApproverAndLocksRecord()
    {
        var approverId = Guid.NewGuid();
        var sale = SaleRecord.CreateDraft(Guid.NewGuid(), Guid.NewGuid(), 2, 120m, DateTime.UtcNow);
        sale.SubmitForApproval(Guid.NewGuid(), UserRole.Collector);

        sale.Approve(approverId, UserRole.Admin, DateTime.UtcNow);

        sale.ApprovalStatus.Should().Be(SaleApprovalStatus.Approved);
        sale.ApprovedByUserId.Should().Be(approverId);
        sale.CanBeModified.Should().BeFalse();
    }
}

public class InventoryItemTests
{
    [Fact]
    public void UpdateStandardPrice_WhenRoleIsCollector_ThrowsInvalidOperationException()
    {
        var item = new InventoryItem(Guid.NewGuid(), "Compost", InventoryCategory.RecycledProduct, 45, "kg", 60m);

        var action = () => item.UpdateStandardPrice(80m, UserRole.Collector, DateTime.UtcNow);

        action.Should().Throw<InvalidOperationException>();
    }
}
```

- [ ] **Step 2: Run the unit tests to confirm they fail**

Run: `Set-Location ..\EcoTrack-Backend; dotnet test .\tests\EcoTrack.UnitTests\EcoTrack.UnitTests.csproj --filter "FullyQualifiedName~SaleRecordTests|FullyQualifiedName~InventoryItemTests"`
Expected: FAIL because the domain project, entities, and tests do not exist yet.

- [ ] **Step 3: Create the domain project, reference it from tests, and implement the model**

```powershell
Set-Location ..\EcoTrack-Backend
dotnet new classlib -n EcoTrack.Domain -o .\src\EcoTrack.Domain
dotnet new xunit -n EcoTrack.UnitTests -o .\tests\EcoTrack.UnitTests
dotnet sln .\EcoTrack-Backend.sln add .\src\EcoTrack.Domain\EcoTrack.Domain.csproj
dotnet sln .\EcoTrack-Backend.sln add .\tests\EcoTrack.UnitTests\EcoTrack.UnitTests.csproj
dotnet add .\tests\EcoTrack.UnitTests\EcoTrack.UnitTests.csproj reference .\src\EcoTrack.Domain\EcoTrack.Domain.csproj
dotnet add .\tests\EcoTrack.UnitTests\EcoTrack.UnitTests.csproj package FluentAssertions
```

```csharp
// ../EcoTrack-Backend/src/EcoTrack.Domain/Inventory/SaleRecord.cs
using EcoTrack.Domain.Auth;

namespace EcoTrack.Domain.Inventory;

public class SaleRecord
{
    private SaleRecord() { }

    public Guid Id { get; private set; }
    public Guid InventoryItemId { get; private set; }
    public Guid RequestedByUserId { get; private set; }
    public Guid? ApprovedByUserId { get; private set; }
    public int QuantitySold { get; private set; }
    public decimal RevenueInr { get; private set; }
    public DateTime SoldAtUtc { get; private set; }
    public SaleApprovalStatus ApprovalStatus { get; private set; }
    public DateTime? ApprovedAtUtc { get; private set; }
    public string? RejectionReason { get; private set; }
    public bool CanBeModified => ApprovalStatus != SaleApprovalStatus.Approved;

    public static SaleRecord CreateDraft(Guid inventoryItemId, Guid requestedByUserId, int quantitySold, decimal revenueInr, DateTime soldAtUtc)
    {
        if (quantitySold <= 0) throw new InvalidOperationException("Quantity sold must be greater than zero.");
        if (revenueInr < 0) throw new InvalidOperationException("Revenue must be non-negative.");

        return new SaleRecord
        {
            Id = Guid.NewGuid(),
            InventoryItemId = inventoryItemId,
            RequestedByUserId = requestedByUserId,
            QuantitySold = quantitySold,
            RevenueInr = revenueInr,
            SoldAtUtc = soldAtUtc,
            ApprovalStatus = SaleApprovalStatus.Draft,
        };
    }

    public void SubmitForApproval(Guid actorUserId, UserRole actorRole)
    {
        if (ApprovalStatus != SaleApprovalStatus.Draft)
            throw new InvalidOperationException("Only draft sales can be submitted for approval.");
        if (actorRole == UserRole.Collector && actorUserId != RequestedByUserId)
            throw new InvalidOperationException("Collectors can submit only their own sales.");

        ApprovalStatus = SaleApprovalStatus.PendingApproval;
    }

    public void Approve(Guid approverUserId, UserRole approverRole, DateTime approvedAtUtc)
    {
        if (approverRole != UserRole.Admin)
            throw new InvalidOperationException("Only admins can approve sales.");
        if (ApprovalStatus != SaleApprovalStatus.PendingApproval)
            throw new InvalidOperationException("Only pending sales can be approved.");

        ApprovalStatus = SaleApprovalStatus.Approved;
        ApprovedByUserId = approverUserId;
        ApprovedAtUtc = approvedAtUtc;
    }
}
```

```csharp
// ../EcoTrack-Backend/src/EcoTrack.Domain/Inventory/InventoryItem.cs
using EcoTrack.Domain.Auth;

namespace EcoTrack.Domain.Inventory;

public class InventoryItem
{
    public InventoryItem(Guid id, string name, InventoryCategory category, decimal quantityKg, string unit, decimal standardPriceInr)
    {
        if (string.IsNullOrWhiteSpace(name)) throw new InvalidOperationException("Name is required.");
        if (quantityKg < 0) throw new InvalidOperationException("Quantity cannot be negative.");
        if (standardPriceInr < 0) throw new InvalidOperationException("Price cannot be negative.");

        Id = id;
        Name = name.Trim();
        Category = category;
        QuantityKg = quantityKg;
        Unit = unit;
        StandardPriceInr = standardPriceInr;
    }

    public Guid Id { get; }
    public string Name { get; private set; }
    public InventoryCategory Category { get; private set; }
    public decimal QuantityKg { get; private set; }
    public string Unit { get; private set; }
    public decimal StandardPriceInr { get; private set; }

    public void UpdateStandardPrice(decimal newPrice, UserRole actorRole, DateTime updatedAtUtc)
    {
        if (actorRole != UserRole.Admin) throw new InvalidOperationException("Only admins can update price.");
        if (newPrice < 0) throw new InvalidOperationException("Price cannot be negative.");

        StandardPriceInr = newPrice;
    }
}
```

- [ ] **Step 4: Run the unit tests again**

Run: `Set-Location ..\EcoTrack-Backend; dotnet test .\tests\EcoTrack.UnitTests\EcoTrack.UnitTests.csproj --filter "FullyQualifiedName~SaleRecordTests|FullyQualifiedName~InventoryItemTests"`
Expected: PASS with the core sale and pricing rules enforced by the domain model.

- [ ] **Step 5: Commit the domain layer**

```powershell
Set-Location ..\EcoTrack-Backend
git add .
git commit -m "feat: add domain models for auth and inventory rules"
```

### Task 3: Add Application and Infrastructure Foundations with PostgreSQL Persistence

**Files:**
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/EcoTrack.Application.csproj`
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Common/Interfaces/IApplicationDbContext.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Common/Exceptions/NotFoundException.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Common/Exceptions/ConflictException.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Common/Exceptions/ForbiddenException.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Infrastructure/EcoTrack.Infrastructure.csproj`
- Create: `../EcoTrack-Backend/src/EcoTrack.Infrastructure/Persistence/AppDbContext.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Infrastructure/Persistence/Configurations/UserConfiguration.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Infrastructure/Persistence/Configurations/InventoryItemConfiguration.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Infrastructure/Persistence/Configurations/SaleRecordConfiguration.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Infrastructure/Persistence/Seed/DevelopmentDataSeeder.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Infrastructure/DependencyInjection.cs`
- Modify: `../EcoTrack-Backend/src/EcoTrack.Api/Program.cs`
- Create: `../EcoTrack-Backend/tests/EcoTrack.IntegrationTests/Infrastructure/IntegrationTestWebAppFactory.cs`

- [ ] **Step 1: Write the failing PostgreSQL-backed integration test for seeded inventory data**

```csharp
using System.Net;
using FluentAssertions;

namespace EcoTrack.IntegrationTests.Inventory;

public class InventorySeedTests : IClassFixture<IntegrationTestWebAppFactory>
{
    private readonly HttpClient _client;

    public InventorySeedTests(IntegrationTestWebAppFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetInventoryItems_WithoutAuth_ReturnsUnauthorizedAfterDatabaseBootstraps()
    {
        var response = await _client.GetAsync("/api/inventory/items");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
```

- [ ] **Step 2: Run the integration test to confirm the persistence and auth foundations are missing**

Run: `Set-Location ..\EcoTrack-Backend; dotnet test .\tests\EcoTrack.IntegrationTests\EcoTrack.IntegrationTests.csproj --filter "FullyQualifiedName~InventorySeedTests"`
Expected: FAIL because the API does not have PostgreSQL wiring, auth configuration, or inventory routes yet.

- [ ] **Step 3: Create the application and infrastructure projects, add references, and wire EF Core with PostgreSQL**

```powershell
Set-Location ..\EcoTrack-Backend
dotnet new classlib -n EcoTrack.Application -o .\src\EcoTrack.Application
dotnet new classlib -n EcoTrack.Infrastructure -o .\src\EcoTrack.Infrastructure
dotnet sln .\EcoTrack-Backend.sln add .\src\EcoTrack.Application\EcoTrack.Application.csproj
dotnet sln .\EcoTrack-Backend.sln add .\src\EcoTrack.Infrastructure\EcoTrack.Infrastructure.csproj
dotnet add .\src\EcoTrack.Application\EcoTrack.Application.csproj reference .\src\EcoTrack.Domain\EcoTrack.Domain.csproj
dotnet add .\src\EcoTrack.Infrastructure\EcoTrack.Infrastructure.csproj reference .\src\EcoTrack.Application\EcoTrack.Application.csproj
dotnet add .\src\EcoTrack.Infrastructure\EcoTrack.Infrastructure.csproj reference .\src\EcoTrack.Domain\EcoTrack.Domain.csproj
dotnet add .\src\EcoTrack.Api\EcoTrack.Api.csproj reference .\src\EcoTrack.Application\EcoTrack.Application.csproj
dotnet add .\src\EcoTrack.Api\EcoTrack.Api.csproj reference .\src\EcoTrack.Infrastructure\EcoTrack.Infrastructure.csproj
dotnet add .\src\EcoTrack.Infrastructure\EcoTrack.Infrastructure.csproj package Microsoft.EntityFrameworkCore
dotnet add .\src\EcoTrack.Infrastructure\EcoTrack.Infrastructure.csproj package Npgsql.EntityFrameworkCore.PostgreSQL
dotnet add .\src\EcoTrack.Infrastructure\EcoTrack.Infrastructure.csproj package Microsoft.EntityFrameworkCore.Design
dotnet add .\src\EcoTrack.Api\EcoTrack.Api.csproj package Microsoft.AspNetCore.Authentication.JwtBearer
dotnet add .\tests\EcoTrack.IntegrationTests\EcoTrack.IntegrationTests.csproj package DotNet.Testcontainers
dotnet add .\tests\EcoTrack.IntegrationTests\EcoTrack.IntegrationTests.csproj package Npgsql
```

```csharp
// ../EcoTrack-Backend/src/EcoTrack.Infrastructure/Persistence/AppDbContext.cs
using EcoTrack.Application.Common.Interfaces;
using EcoTrack.Domain.Auth;
using EcoTrack.Domain.Inventory;
using Microsoft.EntityFrameworkCore;

namespace EcoTrack.Infrastructure.Persistence;

public class AppDbContext : DbContext, IApplicationDbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<InventoryItem> InventoryItems => Set<InventoryItem>();
    public DbSet<SaleRecord> SaleRecords => Set<SaleRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
```

```csharp
// ../EcoTrack-Backend/src/EcoTrack.Infrastructure/DependencyInjection.cs
using EcoTrack.Application.Common.Interfaces;
using EcoTrack.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace EcoTrack.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("EcoTrackDb")));

        services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<AppDbContext>());
        return services;
    }
}
```

- [ ] **Step 4: Update the API host to use PostgreSQL and a testable host factory**

```csharp
// ../EcoTrack-Backend/src/EcoTrack.Api/Program.cs
using EcoTrack.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer();
builder.Services.AddAuthorization();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

public partial class Program;
```

```csharp
// ../EcoTrack-Backend/tests/EcoTrack.IntegrationTests/Infrastructure/IntegrationTestWebAppFactory.cs
using DotNet.Testcontainers.Builders;
using DotNet.Testcontainers.Containers;
using EcoTrack.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace EcoTrack.IntegrationTests;

public class IntegrationTestWebAppFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly IContainer _postgres = new ContainerBuilder()
        .WithImage("postgres:16-alpine")
        .WithEnvironment("POSTGRES_DB", "ecotrack_test")
        .WithEnvironment("POSTGRES_USER", "postgres")
        .WithEnvironment("POSTGRES_PASSWORD", "postgres")
        .WithPortBinding(5432, true)
        .WithWaitStrategy(Wait.ForUnixContainer().UntilPortIsAvailable(5432))
        .Build();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.AddDbContext<AppDbContext>(options =>
                options.UseNpgsql($"Host=localhost;Port={_postgres.GetMappedPublicPort(5432)};Database=ecotrack_test;Username=postgres;Password=postgres"));
        });
    }

    public async Task InitializeAsync() => await _postgres.StartAsync();

    public new async Task DisposeAsync() => await _postgres.DisposeAsync();
}
```

- [ ] **Step 5: Run the failing integration test again to confirm the API now boots but the feature route still does not exist**

Run: `Set-Location ..\EcoTrack-Backend; dotnet test .\tests\EcoTrack.IntegrationTests\EcoTrack.IntegrationTests.csproj --filter "FullyQualifiedName~InventorySeedTests"`
Expected: FAIL with `404 Not Found` or route-missing behavior, proving the host and PostgreSQL wiring work before the inventory feature is added.

- [ ] **Step 6: Commit the persistence foundation**

```powershell
Set-Location ..\EcoTrack-Backend
git add .
git commit -m "feat: add application and PostgreSQL persistence foundation"
```

### Task 4: Implement Auth Login and Current User Endpoints

**Files:**
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Auth/Contracts/LoginRequest.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Auth/Contracts/AuthResponse.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Auth/Contracts/CurrentUserResponse.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Auth/Login/LoginRequestValidator.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Auth/Interfaces/IJwtTokenGenerator.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Auth/Interfaces/IPasswordHasher.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Auth/Login/LoginService.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Infrastructure/Security/JwtOptions.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Infrastructure/Security/JwtTokenGenerator.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Infrastructure/Security/PasswordHasher.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Api/Controllers/AuthController.cs`
- Modify: `../EcoTrack-Backend/src/EcoTrack.Api/Program.cs`
- Modify: `../EcoTrack-Backend/src/EcoTrack.Api/appsettings.json`
- Create: `../EcoTrack-Backend/tests/EcoTrack.IntegrationTests/Auth/AuthEndpointsTests.cs`

- [ ] **Step 1: Write the failing integration tests for login and `/me`**

```csharp
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;

namespace EcoTrack.IntegrationTests.Auth;

public class AuthEndpointsTests : IClassFixture<IntegrationTestWebAppFactory>
{
    private readonly HttpClient _client;

    public AuthEndpointsTests(IntegrationTestWebAppFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Login_WithSeededAdminCredentials_ReturnsJwtToken()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "admin@ecotrack.local",
            password = "admin123"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await response.Content.ReadFromJsonAsync<AuthResponseContract>();
        payload!.Token.Should().NotBeNullOrWhiteSpace();
        payload.User.Role.Should().Be("admin");
    }

    [Fact]
    public async Task Me_WithValidToken_ReturnsCurrentUser()
    {
        var login = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "collector@ecotrack.local",
            password = "collector123"
        });

        var payload = await login.Content.ReadFromJsonAsync<AuthResponseContract>();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", payload!.Token);

        var response = await _client.GetAsync("/api/auth/me");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var user = await response.Content.ReadFromJsonAsync<CurrentUserContract>();
        user!.Role.Should().Be("collector");
    }

    private sealed record AuthResponseContract(string Token, CurrentUserContract User);
    private sealed record CurrentUserContract(Guid Id, string Name, string Email, string Role);
}
```

- [ ] **Step 2: Run the auth integration tests to verify failure**

Run: `Set-Location ..\EcoTrack-Backend; dotnet test .\tests\EcoTrack.IntegrationTests\EcoTrack.IntegrationTests.csproj --filter "FullyQualifiedName~AuthEndpointsTests"`
Expected: FAIL because auth endpoints, JWT configuration, and seeded users are not implemented yet.

- [ ] **Step 3: Implement login contracts, validators, password hashing, JWT generation, and seed users**

```csharp
// ../EcoTrack-Backend/src/EcoTrack.Application/Auth/Login/LoginService.cs
using EcoTrack.Application.Auth.Contracts;
using EcoTrack.Application.Auth.Interfaces;
using EcoTrack.Application.Common.Interfaces;
using EcoTrack.Domain.Auth;
using Microsoft.EntityFrameworkCore;

namespace EcoTrack.Application.Auth.Login;

public class LoginService
{
    private readonly IApplicationDbContext _dbContext;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;

    public LoginService(IApplicationDbContext dbContext, IPasswordHasher passwordHasher, IJwtTokenGenerator jwtTokenGenerator)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _jwtTokenGenerator = jwtTokenGenerator;
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users.SingleOrDefaultAsync(x => x.Email == request.Email, cancellationToken)
            ?? throw new UnauthorizedAccessException("Invalid credentials.");

        if (!user.IsActive || !_passwordHasher.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Invalid credentials.");

        var token = _jwtTokenGenerator.GenerateToken(user);

        return new AuthResponse(
            token,
            new CurrentUserResponse(user.Id, user.Name, user.Email, user.Role.ToString().ToLowerInvariant()));
    }
}
```

```csharp
// ../EcoTrack-Backend/src/EcoTrack.Infrastructure/Security/JwtTokenGenerator.cs
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using EcoTrack.Application.Auth.Interfaces;
using EcoTrack.Domain.Auth;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace EcoTrack.Infrastructure.Security;

public class JwtTokenGenerator : IJwtTokenGenerator
{
    private readonly JwtOptions _options;

    public JwtTokenGenerator(IOptions<JwtOptions> options)
    {
        _options = options.Value;
    }

    public string GenerateToken(User user)
    {
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role.ToString().ToLowerInvariant()),
            new Claim(ClaimTypes.Name, user.Name),
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SecretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_options.ExpiryMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
```

```csharp
// ../EcoTrack-Backend/src/EcoTrack.Api/Controllers/AuthController.cs
using EcoTrack.Application.Auth.Contracts;
using EcoTrack.Application.Auth.Login;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EcoTrack.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Login([FromServices] LoginService service, [FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        return Ok(await service.LoginAsync(request, cancellationToken));
    }

    [HttpGet("me")]
    [Authorize]
    public ActionResult<object> Me()
    {
        return Ok(new
        {
            id = User.FindFirst("sub")?.Value,
            name = User.Identity?.Name,
            email = User.FindFirst("email")?.Value,
            role = User.FindFirst("http://schemas.microsoft.com/ws/2008/06/identity/claims/role")?.Value,
        });
    }
}
```

- [ ] **Step 4: Run the auth integration tests again**

Run: `Set-Location ..\EcoTrack-Backend; dotnet test .\tests\EcoTrack.IntegrationTests\EcoTrack.IntegrationTests.csproj --filter "FullyQualifiedName~AuthEndpointsTests"`
Expected: PASS with seeded admin and collector users authenticating successfully and `/api/auth/me` returning the authenticated principal.

- [ ] **Step 5: Commit the auth slice**

```powershell
Set-Location ..\EcoTrack-Backend
git add .
git commit -m "feat: add jwt auth and current user endpoints"
```

### Task 5: Implement Inventory Item CRUD Endpoints

**Files:**
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Inventory/Contracts/InventoryItemResponse.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Inventory/Contracts/CreateInventoryItemRequest.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Inventory/Contracts/UpdateInventoryItemRequest.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Inventory/Validators/CreateInventoryItemRequestValidator.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Inventory/Validators/UpdateInventoryItemRequestValidator.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Inventory/InventoryService.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Api/Controllers/InventoryController.cs`
- Create: `../EcoTrack-Backend/tests/EcoTrack.IntegrationTests/Inventory/InventoryEndpointsTests.cs`

- [ ] **Step 1: Write the failing integration tests for inventory list and create**

```csharp
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;

namespace EcoTrack.IntegrationTests.Inventory;

public class InventoryEndpointsTests : IClassFixture<IntegrationTestWebAppFactory>
{
    private readonly HttpClient _client;

    public InventoryEndpointsTests(IntegrationTestWebAppFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetItems_WithAdminToken_ReturnsSeededItems()
    {
        await AuthenticateAsAdminAsync();

        var response = await _client.GetAsync("/api/inventory/items");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var items = await response.Content.ReadFromJsonAsync<List<InventoryItemContract>>();
        items.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task PostItem_WithAdminToken_CreatesInventoryItem()
    {
        await AuthenticateAsAdminAsync();

        var response = await _client.PostAsJsonAsync("/api/inventory/items", new
        {
            name = "Sorted Paper Bale",
            category = "rawWaste",
            quantityKg = 35,
            unit = "kg",
            standardPriceInr = 12
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    private async Task AuthenticateAsAdminAsync()
    {
        var login = await _client.PostAsJsonAsync("/api/auth/login", new { email = "admin@ecotrack.local", password = "admin123" });
        var payload = await login.Content.ReadFromJsonAsync<AuthPayload>();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", payload!.Token);
    }

    private sealed record AuthPayload(string Token);
    private sealed record InventoryItemContract(Guid Id, string Name, string Category, decimal QuantityKg, string Unit, decimal StandardPriceInr);
}
```

- [ ] **Step 2: Run the inventory endpoint tests to verify failure**

Run: `Set-Location ..\EcoTrack-Backend; dotnet test .\tests\EcoTrack.IntegrationTests\EcoTrack.IntegrationTests.csproj --filter "FullyQualifiedName~InventoryEndpointsTests"`
Expected: FAIL because inventory DTOs, services, validators, and endpoints are not implemented yet.

- [ ] **Step 3: Implement the inventory contracts, validators, service, and controller**

```csharp
// ../EcoTrack-Backend/src/EcoTrack.Application/Inventory/InventoryService.cs
using EcoTrack.Application.Common.Exceptions;
using EcoTrack.Application.Common.Interfaces;
using EcoTrack.Application.Inventory.Contracts;
using EcoTrack.Domain.Inventory;
using Microsoft.EntityFrameworkCore;

namespace EcoTrack.Application.Inventory;

public class InventoryService
{
    private readonly IApplicationDbContext _dbContext;

    public InventoryService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<List<InventoryItemResponse>> GetItemsAsync(CancellationToken cancellationToken)
    {
        return await _dbContext.InventoryItems
            .Select(item => new InventoryItemResponse(item.Id, item.Name, item.Category.ToString(), item.QuantityKg, item.Unit, item.StandardPriceInr))
            .ToListAsync(cancellationToken);
    }

    public async Task<InventoryItemResponse> CreateItemAsync(CreateInventoryItemRequest request, CancellationToken cancellationToken)
    {
        var item = new InventoryItem(Guid.NewGuid(), request.Name, Enum.Parse<InventoryCategory>(request.Category, true), request.QuantityKg, request.Unit, request.StandardPriceInr);
        _dbContext.InventoryItems.Add(item);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new InventoryItemResponse(item.Id, item.Name, item.Category.ToString(), item.QuantityKg, item.Unit, item.StandardPriceInr);
    }
}
```

```csharp
// ../EcoTrack-Backend/src/EcoTrack.Api/Controllers/InventoryController.cs
using EcoTrack.Application.Inventory;
using EcoTrack.Application.Inventory.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EcoTrack.Api.Controllers;

[ApiController]
[Route("api/inventory/items")]
[Authorize]
public class InventoryController : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<InventoryItemResponse>>> Get([FromServices] InventoryService service, CancellationToken cancellationToken)
    {
        return Ok(await service.GetItemsAsync(cancellationToken));
    }

    [HttpPost]
    [Authorize(Roles = "admin")]
    public async Task<ActionResult<InventoryItemResponse>> Post([FromServices] InventoryService service, [FromBody] CreateInventoryItemRequest request, CancellationToken cancellationToken)
    {
        var created = await service.CreateItemAsync(request, cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }
}
```

- [ ] **Step 4: Run the inventory endpoint tests again**

Run: `Set-Location ..\EcoTrack-Backend; dotnet test .\tests\EcoTrack.IntegrationTests\EcoTrack.IntegrationTests.csproj --filter "FullyQualifiedName~InventoryEndpointsTests"`
Expected: PASS for inventory listing and admin-only item creation.

- [ ] **Step 5: Commit inventory CRUD**

```powershell
Set-Location ..\EcoTrack-Backend
git add .
git commit -m "feat: add inventory item crud endpoints"
```

### Task 6: Enforce Admin-Only Standard Price Updates

**Files:**
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Inventory/Contracts/UpdateInventoryPriceRequest.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Inventory/Validators/UpdateInventoryPriceRequestValidator.cs`
- Modify: `../EcoTrack-Backend/src/EcoTrack.Application/Inventory/InventoryService.cs`
- Modify: `../EcoTrack-Backend/src/EcoTrack.Api/Controllers/InventoryController.cs`
- Modify: `../EcoTrack-Backend/tests/EcoTrack.IntegrationTests/Inventory/InventoryEndpointsTests.cs`

- [ ] **Step 1: Add the failing integration tests for price updates**

```csharp
[Fact]
public async Task PatchPrice_WithCollectorToken_ReturnsForbidden()
{
    await AuthenticateAsCollectorAsync();

    var response = await _client.PatchAsJsonAsync("/api/inventory/items/00000000-0000-0000-0000-000000000001/price", new
    {
        standardPriceInr = 77
    });

    response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
}

[Fact]
public async Task PatchPrice_WithAdminToken_UpdatesStandardPrice()
{
    await AuthenticateAsAdminAsync();
    var firstItem = (await (await _client.GetAsync("/api/inventory/items")).Content.ReadFromJsonAsync<List<InventoryItemContract>>())!.First();

    var response = await _client.PatchAsJsonAsync($"/api/inventory/items/{firstItem.Id}/price", new
    {
        standardPriceInr = 77
    });

    response.StatusCode.Should().Be(HttpStatusCode.OK);
    var updated = await response.Content.ReadFromJsonAsync<InventoryItemContract>();
    updated!.StandardPriceInr.Should().Be(77);
}
```

- [ ] **Step 2: Run the price update tests to verify failure**

Run: `Set-Location ..\EcoTrack-Backend; dotnet test .\tests\EcoTrack.IntegrationTests\EcoTrack.IntegrationTests.csproj --filter "price"`
Expected: FAIL because the price endpoint and update logic do not exist yet.

- [ ] **Step 3: Implement the price update service method and endpoint**

```csharp
// ../EcoTrack-Backend/src/EcoTrack.Application/Inventory/InventoryService.cs
public async Task<InventoryItemResponse> UpdatePriceAsync(Guid id, UpdateInventoryPriceRequest request, string actorRole, CancellationToken cancellationToken)
{
    var item = await _dbContext.InventoryItems.SingleOrDefaultAsync(x => x.Id == id, cancellationToken)
        ?? throw new NotFoundException($"Inventory item {id} was not found.");

    item.UpdateStandardPrice(request.StandardPriceInr, Enum.Parse<EcoTrack.Domain.Auth.UserRole>(actorRole, true), DateTime.UtcNow);
    await _dbContext.SaveChangesAsync(cancellationToken);

    return new InventoryItemResponse(item.Id, item.Name, item.Category.ToString(), item.QuantityKg, item.Unit, item.StandardPriceInr);
}
```

```csharp
// ../EcoTrack-Backend/src/EcoTrack.Api/Controllers/InventoryController.cs
[HttpPatch("{id:guid}/price")]
[Authorize(Roles = "admin")]
public async Task<ActionResult<InventoryItemResponse>> PatchPrice(
    Guid id,
    [FromServices] InventoryService service,
    [FromBody] UpdateInventoryPriceRequest request,
    CancellationToken cancellationToken)
{
    var updated = await service.UpdatePriceAsync(id, request, User.IsInRole("admin") ? "Admin" : "Collector", cancellationToken);
    return Ok(updated);
}
```

- [ ] **Step 4: Run the price update tests again**

Run: `Set-Location ..\EcoTrack-Backend; dotnet test .\tests\EcoTrack.IntegrationTests\EcoTrack.IntegrationTests.csproj --filter "price"`
Expected: PASS with collectors blocked and admins allowed to update standard pricing.

- [ ] **Step 5: Commit the pricing rule**

```powershell
Set-Location ..\EcoTrack-Backend
git add .
git commit -m "feat: enforce admin-only inventory price updates"
```

### Task 7: Implement Sales Draft, Submit, Approve, and Lock Workflow

**Files:**
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Inventory/Contracts/SaleRecordResponse.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Inventory/Contracts/CreateSaleRequest.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Inventory/Contracts/UpdateSaleRequest.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Inventory/Validators/CreateSaleRequestValidator.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Inventory/Validators/UpdateSaleRequestValidator.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Application/Inventory/SalesService.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Api/Controllers/SalesController.cs`
- Create: `../EcoTrack-Backend/tests/EcoTrack.IntegrationTests/Inventory/SalesEndpointsTests.cs`

- [ ] **Step 1: Write the failing integration tests for sale draft and approval flow**

```csharp
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;

namespace EcoTrack.IntegrationTests.Inventory;

public class SalesEndpointsTests : IClassFixture<IntegrationTestWebAppFactory>
{
    private readonly HttpClient _client;

    public SalesEndpointsTests(IntegrationTestWebAppFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task CollectorCanCreateDraftAndSubmitForApproval()
    {
        await AuthenticateAsCollectorAsync();
        var itemId = await GetFirstInventoryItemIdAsync();

        var createResponse = await _client.PostAsJsonAsync("/api/inventory/sales", new
        {
            inventoryItemId = itemId,
            quantitySold = 2,
            soldAtUtc = DateTime.UtcNow
        });

        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await createResponse.Content.ReadFromJsonAsync<SaleRecordContract>();

        var submitResponse = await _client.PostAsync($"/api/inventory/sales/{created!.Id}/submit", null);
        submitResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task AdminCanApprovePendingSale_AndApprovedSaleCannotBeEdited()
    {
        await AuthenticateAsCollectorAsync();
        var itemId = await GetFirstInventoryItemIdAsync();
        var createResponse = await _client.PostAsJsonAsync("/api/inventory/sales", new { inventoryItemId = itemId, quantitySold = 1, soldAtUtc = DateTime.UtcNow });
        var created = await createResponse.Content.ReadFromJsonAsync<SaleRecordContract>();
        await _client.PostAsync($"/api/inventory/sales/{created!.Id}/submit", null);

        await AuthenticateAsAdminAsync();
        var approveResponse = await _client.PostAsync($"/api/inventory/sales/{created.Id}/approve", null);
        approveResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var updateResponse = await _client.PutAsJsonAsync($"/api/inventory/sales/{created.Id}", new { quantitySold = 3, soldAtUtc = DateTime.UtcNow });
        updateResponse.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    private async Task<Guid> GetFirstInventoryItemIdAsync()
    {
        var response = await _client.GetFromJsonAsync<List<InventoryItemContract>>("/api/inventory/items");
        return response!.First().Id;
    }

    private async Task AuthenticateAsCollectorAsync()
    {
        var login = await _client.PostAsJsonAsync("/api/auth/login", new { email = "collector@ecotrack.local", password = "collector123" });
        var payload = await login.Content.ReadFromJsonAsync<AuthPayload>();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", payload!.Token);
    }

    private async Task AuthenticateAsAdminAsync()
    {
        var login = await _client.PostAsJsonAsync("/api/auth/login", new { email = "admin@ecotrack.local", password = "admin123" });
        var payload = await login.Content.ReadFromJsonAsync<AuthPayload>();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", payload!.Token);
    }

    private sealed record AuthPayload(string Token);
    private sealed record InventoryItemContract(Guid Id, string Name, string Category, decimal QuantityKg, string Unit, decimal StandardPriceInr);
    private sealed record SaleRecordContract(Guid Id, Guid InventoryItemId, int QuantitySold, decimal RevenueInr, string ApprovalStatus);
}
```

- [ ] **Step 2: Run the sales workflow tests to verify failure**

Run: `Set-Location ..\EcoTrack-Backend; dotnet test .\tests\EcoTrack.IntegrationTests\EcoTrack.IntegrationTests.csproj --filter "FullyQualifiedName~SalesEndpointsTests"`
Expected: FAIL because the sales service and endpoints are not implemented yet.

- [ ] **Step 3: Implement sales DTOs, service methods, and controller endpoints**

```csharp
// ../EcoTrack-Backend/src/EcoTrack.Application/Inventory/SalesService.cs
using EcoTrack.Application.Common.Exceptions;
using EcoTrack.Application.Common.Interfaces;
using EcoTrack.Application.Inventory.Contracts;
using EcoTrack.Domain.Auth;
using EcoTrack.Domain.Inventory;
using Microsoft.EntityFrameworkCore;

namespace EcoTrack.Application.Inventory;

public class SalesService
{
    private readonly IApplicationDbContext _dbContext;

    public SalesService(IApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<SaleRecordResponse> CreateDraftAsync(CreateSaleRequest request, Guid actorUserId, CancellationToken cancellationToken)
    {
        var item = await _dbContext.InventoryItems.SingleOrDefaultAsync(x => x.Id == request.InventoryItemId, cancellationToken)
            ?? throw new NotFoundException("Inventory item not found.");

        var revenue = item.StandardPriceInr * request.QuantitySold;
        var sale = SaleRecord.CreateDraft(item.Id, actorUserId, request.QuantitySold, revenue, request.SoldAtUtc);
        _dbContext.SaleRecords.Add(sale);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new SaleRecordResponse(sale.Id, sale.InventoryItemId, sale.QuantitySold, sale.RevenueInr, sale.SoldAtUtc, sale.ApprovalStatus.ToString(), sale.RequestedByUserId, sale.ApprovedByUserId, sale.ApprovedAtUtc, sale.RejectionReason);
    }

    public async Task<SaleRecordResponse> SubmitAsync(Guid id, Guid actorUserId, string actorRole, CancellationToken cancellationToken)
    {
        var sale = await _dbContext.SaleRecords.SingleOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new NotFoundException("Sale record not found.");

        sale.SubmitForApproval(actorUserId, Enum.Parse<UserRole>(actorRole, true));
        await _dbContext.SaveChangesAsync(cancellationToken);
        return new SaleRecordResponse(sale.Id, sale.InventoryItemId, sale.QuantitySold, sale.RevenueInr, sale.SoldAtUtc, sale.ApprovalStatus.ToString(), sale.RequestedByUserId, sale.ApprovedByUserId, sale.ApprovedAtUtc, sale.RejectionReason);
    }

    public async Task<SaleRecordResponse> ApproveAsync(Guid id, Guid actorUserId, CancellationToken cancellationToken)
    {
        var sale = await _dbContext.SaleRecords.SingleOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new NotFoundException("Sale record not found.");

        sale.Approve(actorUserId, UserRole.Admin, DateTime.UtcNow);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return new SaleRecordResponse(sale.Id, sale.InventoryItemId, sale.QuantitySold, sale.RevenueInr, sale.SoldAtUtc, sale.ApprovalStatus.ToString(), sale.RequestedByUserId, sale.ApprovedByUserId, sale.ApprovedAtUtc, sale.RejectionReason);
    }
}
```

```csharp
// ../EcoTrack-Backend/src/EcoTrack.Api/Controllers/SalesController.cs
using System.Security.Claims;
using EcoTrack.Application.Inventory;
using EcoTrack.Application.Inventory.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EcoTrack.Api.Controllers;

[ApiController]
[Route("api/inventory/sales")]
[Authorize]
public class SalesController : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<SaleRecordResponse>> Post([FromServices] SalesService service, [FromBody] CreateSaleRequest request, CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!);
        var created = await service.CreateDraftAsync(request, userId, cancellationToken);
        return CreatedAtAction(nameof(Post), new { id = created.Id }, created);
    }

    [HttpPost("{id:guid}/submit")]
    public async Task<ActionResult<SaleRecordResponse>> Submit(Guid id, [FromServices] SalesService service, CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!);
        var role = User.FindFirstValue(ClaimTypes.Role) ?? "collector";
        return Ok(await service.SubmitAsync(id, userId, role, cancellationToken));
    }

    [HttpPost("{id:guid}/approve")]
    [Authorize(Roles = "admin")]
    public async Task<ActionResult<SaleRecordResponse>> Approve(Guid id, [FromServices] SalesService service, CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!);
        return Ok(await service.ApproveAsync(id, userId, cancellationToken));
    }
}
```

- [ ] **Step 4: Run the sales workflow tests again**

Run: `Set-Location ..\EcoTrack-Backend; dotnet test .\tests\EcoTrack.IntegrationTests\EcoTrack.IntegrationTests.csproj --filter "FullyQualifiedName~SalesEndpointsTests"`
Expected: PASS with collector draft submission, admin approval, and approved-sale lock behavior enforced end to end.

- [ ] **Step 5: Commit the sales workflow**

```powershell
Set-Location ..\EcoTrack-Backend
git add .
git commit -m "feat: add inventory sales approval workflow"
```

### Task 8: Add API Error Handling, Swagger Security, Migrations, and Setup Docs

**Files:**
- Create: `../EcoTrack-Backend/src/EcoTrack.Api/Contracts/Common/ApiErrorResponse.cs`
- Create: `../EcoTrack-Backend/src/EcoTrack.Api/Middleware/ApiExceptionMiddleware.cs`
- Modify: `../EcoTrack-Backend/src/EcoTrack.Api/Program.cs`
- Modify: `../EcoTrack-Backend/src/EcoTrack.Api/appsettings.json`
- Create: `../EcoTrack-Backend/README.md`

- [ ] **Step 1: Write the failing integration test for conflict error mapping**

```csharp
[Fact]
public async Task UpdatingApprovedSale_ReturnsConflictPayload()
{
    await AuthenticateAsCollectorAsync();
    var itemId = await GetFirstInventoryItemIdAsync();
    var createResponse = await _client.PostAsJsonAsync("/api/inventory/sales", new { inventoryItemId = itemId, quantitySold = 1, soldAtUtc = DateTime.UtcNow });
    var created = await createResponse.Content.ReadFromJsonAsync<SaleRecordContract>();
    await _client.PostAsync($"/api/inventory/sales/{created!.Id}/submit", null);
    await AuthenticateAsAdminAsync();
    await _client.PostAsync($"/api/inventory/sales/{created.Id}/approve", null);

    var response = await _client.PutAsJsonAsync($"/api/inventory/sales/{created.Id}", new { quantitySold = 9, soldAtUtc = DateTime.UtcNow });

    response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    var payload = await response.Content.ReadFromJsonAsync<ApiErrorContract>();
    payload!.Status.Should().Be(409);
}

private sealed record ApiErrorContract(int Status, string Message);
```

- [ ] **Step 2: Run the test to verify the middleware contract is not complete yet**

Run: `Set-Location ..\EcoTrack-Backend; dotnet test .\tests\EcoTrack.IntegrationTests\EcoTrack.IntegrationTests.csproj --filter "ConflictPayload"`
Expected: FAIL because the API does not yet normalize application exceptions into consistent error responses.

- [ ] **Step 3: Implement exception middleware, Swagger bearer auth, and README setup instructions**

```csharp
// ../EcoTrack-Backend/src/EcoTrack.Api/Middleware/ApiExceptionMiddleware.cs
using System.Net;
using System.Text.Json;
using EcoTrack.Api.Contracts.Common;
using EcoTrack.Application.Common.Exceptions;

namespace EcoTrack.Api.Middleware;

public class ApiExceptionMiddleware
{
    private readonly RequestDelegate _next;

    public ApiExceptionMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task Invoke(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (NotFoundException ex)
        {
            await WriteErrorAsync(context, HttpStatusCode.NotFound, ex.Message);
        }
        catch (ForbiddenException ex)
        {
            await WriteErrorAsync(context, HttpStatusCode.Forbidden, ex.Message);
        }
        catch (ConflictException ex)
        {
            await WriteErrorAsync(context, HttpStatusCode.Conflict, ex.Message);
        }
        catch (Exception ex)
        {
            await WriteErrorAsync(context, HttpStatusCode.InternalServerError, ex.Message);
        }
    }

    private static async Task WriteErrorAsync(HttpContext context, HttpStatusCode statusCode, string message)
    {
        context.Response.StatusCode = (int)statusCode;
        context.Response.ContentType = "application/json";
        var payload = new ApiErrorResponse((int)statusCode, message);
        await context.Response.WriteAsync(JsonSerializer.Serialize(payload));
    }
}
```

```csharp
// ../EcoTrack-Backend/src/EcoTrack.Api/Program.cs
using EcoTrack.Api.Middleware;
using Microsoft.OpenApi.Models;

builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "EcoTrack API", Version = "v1" });
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

app.UseMiddleware<ApiExceptionMiddleware>();
```

````md
<!-- ../EcoTrack-Backend/README.md -->
# EcoTrack Backend

## Local Setup

1. Install .NET 8 SDK.
2. Install PostgreSQL 16 and create a database named `ecotrack_dev`.
3. Update `src/EcoTrack.Api/appsettings.Development.json` with your local connection string and JWT secret.
4. Run migrations:

```powershell
Set-Location src\EcoTrack.Api
dotnet ef database update
```

5. Start the API:

```powershell
Set-Location src\EcoTrack.Api
dotnet run
```

6. Run tests:

```powershell
Set-Location ..\..
dotnet test .\EcoTrack-Backend.sln
```
````

- [ ] **Step 4: Run the full backend test suite and verify the plan scope is complete**

Run: `Set-Location ..\EcoTrack-Backend; dotnet test .\EcoTrack-Backend.sln`
Expected: PASS with unit and integration suites green, including health, auth, inventory, pricing, sales workflow, and conflict response coverage.

- [ ] **Step 5: Commit the hardening and docs**

```powershell
Set-Location ..\EcoTrack-Backend
git add .
git commit -m "chore: harden api error handling and developer setup"
```

## Self-Review

Spec coverage:
- Auth, inventory CRUD, pricing updates, sales approval workflow, PostgreSQL persistence, JWT auth, logging/error handling, Swagger, and test coverage all have explicit tasks.
- Deferred modules from the design remain out of scope in this plan.

Placeholder scan:
- No unresolved placeholders or vague deferred work markers are left in the task steps.
- Each task includes concrete file paths, test code, commands, and commit checkpoints.

Type consistency:
- The plan consistently uses `InventoryItem`, `SaleRecord`, `User`, `UserRole`, `InventoryCategory`, and `SaleApprovalStatus` across domain, application, API, and tests.
- Auth and inventory DTO names are stable across tasks.