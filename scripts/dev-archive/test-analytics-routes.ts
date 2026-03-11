import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function checkAnalyticsRoutes() {
  console.log('🔍 Checking Analytics Module Registration...\n');

  try {
    // Create app instance without external dependencies
    const app = await NestFactory.create(AppModule, {
      logger: false, // Disable logging for cleaner output
    });

    // ⚠️ CRITICAL: Set global prefix BEFORE initialization
    // This matches the production configuration in main.ts
    app.setGlobalPrefix('api/v1');

    // Initialize the application (triggers module and route registration)
    await app.init();

    // Get server instance
    const server = app.getHttpServer();

    // Check if router exists
    if (!server._events || !server._events.request || !server._events.request._router) {
      console.log('❌ Router not accessible - NestJS version mismatch?');
      await app.close();
      return;
    }

    const router = server._events.request._router;

    // Simple route collection
    const routes: Array<{ method: string; path: string }> = [];
    const moduleRoutes: Record<string, Array<{ method: string; path: string }>> = {};

    // Check router stack
    // Check router stack
    if (Array.isArray(router.stack)) {
      router.stack.forEach((layer) => {
        // Check for route layers
        if (layer.route && layer.route.path && layer.route.stack && layer.route.stack[0]) {
          const route = {
            method: layer.route.stack[0].method?.toUpperCase() || 'UNKNOWN',
            path: layer.route.path,
          };
          routes.push(route);

          // Group by module - FIX HERE
          const moduleName = getModuleFromPath(route.path); // Removed "this."
          if (!moduleRoutes[moduleName]) {
            moduleRoutes[moduleName] = [];
          }
          moduleRoutes[moduleName].push(route);
        }

        // Check for nested routers (module routers)
        if (layer.name === 'router' && layer.handle && layer.handle.stack) {
          if (Array.isArray(layer.handle.stack)) {
            layer.handle.stack.forEach((nestedLayer) => {
              if (
                nestedLayer.route &&
                nestedLayer.route.path &&
                nestedLayer.route.stack &&
                nestedLayer.route.stack[0]
              ) {
                const route = {
                  method: nestedLayer.route.stack[0].method?.toUpperCase() || 'UNKNOWN',
                  path: nestedLayer.route.path,
                };
                routes.push(route);

                // Group by module - FIX HERE
                const moduleName = getModuleFromPath(route.path); // Removed "this."
                if (!moduleRoutes[moduleName]) {
                  moduleRoutes[moduleName] = [];
                }
                moduleRoutes[moduleName].push(route);
              }
            });
          }
        }
      });
    }

    console.log(`📊 Total routes found: ${routes.length}\n`);

    // Display routes by module
    console.log('📦 Routes grouped by module:');
    console.log('='.repeat(50));
    Object.keys(moduleRoutes)
      .sort()
      .forEach((moduleName) => {
        const count = moduleRoutes[moduleName].length;
        console.log(`  ${moduleName.padEnd(15)}: ${count} route${count !== 1 ? 's' : ''}`);
      });
    console.log('='.repeat(50) + '\n');

    // Find analytics routes
    const analyticsRoutes = routes.filter((route) => route.path.includes('analytics'));

    if (analyticsRoutes.length === 0) {
      console.log('❌ NO ANALYTICS ROUTES FOUND!\n');
      console.log('Possible issues:');
      console.log('1. AnalyticsModule not imported in AppModule');
      console.log('2. AnalyticsController not properly configured');
      console.log('3. Server not picking up new routes');
      console.log('4. Global prefix mismatch (expected: /api/v1)');

      console.log('\n📋 First 20 routes found:');
      routes.slice(0, 20).forEach((route, i) => {
        console.log(`  ${i + 1}. ${route.method.padEnd(6)} ${route.path}`);
      });

      if (routes.length > 20) {
        console.log(`  ... and ${routes.length - 20} more routes`);
      }
    } else {
      console.log(`✅ Found ${analyticsRoutes.length} analytics route(s):\n`);

      analyticsRoutes.forEach((route, i) => {
        const statusIcon = validateAnalyticsRoute(route) ? '✅' : '⚠️ ';
        console.log(`  ${statusIcon} ${i + 1}. ${route.method.padEnd(6)} ${route.path}`);
      });

      // Check for expected endpoints
      const expectedEndpoints = [
        { path: '/api/v1/analytics/deals', method: 'GET', required: true },
        { path: '/api/v1/analytics/revenue', method: 'GET', required: true },
        { path: '/api/v1/analytics/pipeline', method: 'GET', required: true },
        { path: '/api/v1/analytics/activity', method: 'GET', required: true },
        { path: '/api/v1/analytics/export', method: 'GET', required: true },
        { path: '/api/v1/analytics/export/download/:token', method: 'GET', required: true },
      ];

      console.log('\n🎯 Expected endpoints validation:');
      console.log('-'.repeat(60));

      let allValid = true;
      expectedEndpoints.forEach((expected) => {
        const found = analyticsRoutes.find(
          (route) => route.path === expected.path && route.method === expected.method,
        );

        if (found) {
          console.log(`✅ ${expected.method.padEnd(6)} ${expected.path}`);
        } else if (expected.required) {
          console.log(`❌ ${expected.method.padEnd(6)} ${expected.path} - MISSING`);
          allValid = false;
        } else {
          console.log(`⚠️  ${expected.method.padEnd(6)} ${expected.path} - OPTIONAL (not found)`);
        }
      });
      console.log('-'.repeat(60));

      if (allValid) {
        console.log('\n🎉 SUCCESS: All analytics endpoints are properly registered!');
        console.log('   The module is ready for Phase 3.4 deployment.');
      } else {
        console.log('\n⚠️  WARNING: Some analytics endpoints are missing.');
        console.log('   Please check AnalyticsController implementation.');
      }

      // Additional validation
      console.log('\n🔍 Additional validation:');
      console.log('-'.repeat(60));

      // Check for correct prefix
      const hasCorrectPrefix = analyticsRoutes.every((route) =>
        route.path.startsWith('/api/v1/analytics/'),
      );
      console.log(`✅ Global prefix: ${hasCorrectPrefix ? 'Correct (/api/v1/)' : 'INCORRECT'}`);

      // Check HTTP methods
      const hasOnlyGetMethods = analyticsRoutes.every((route) => route.method === 'GET');
      console.log(
        `✅ HTTP methods: ${hasOnlyGetMethods ? 'All GET (correct)' : 'Mixed methods found'}`,
      );

      // Check for duplicate routes
      const routeMap = new Map();
      const duplicates = [];
      analyticsRoutes.forEach((route) => {
        const key = `${route.method}:${route.path}`;
        if (routeMap.has(key)) {
          duplicates.push(route);
        }
        routeMap.set(key, true);
      });
      console.log(
        `✅ Duplicates: ${duplicates.length === 0 ? 'None found' : `${duplicates.length} duplicates detected`}`,
      );

      console.log('-'.repeat(60));
    }

    // Test direct access (optional)
    console.log('\n🔗 Quick endpoint test (without auth):');
    try {
      const testPath = '/api/v1/analytics/deals';
      const foundRoute = routes.find((r) => r.path === testPath);
      if (foundRoute) {
        console.log(`✅ Route exists: ${foundRoute.method} ${foundRoute.path}`);
        console.log('   Expected: 401 Unauthorized (requires authentication)');
        console.log('   If 404: Route prefix mismatch');
      } else {
        console.log(`❌ Route not found: ${testPath}`);
      }
    } catch (error) {
      console.log(`⚠️  Test skipped: ${error.message}`);
    }

    await app.close();
    console.log('\n✅ Analytics module check completed');
  } catch (error) {
    console.error('\n❌ Error during analytics module check:', error.message);

    if (error.stack) {
      // Show only first few lines of stack trace
      const stackLines = error.stack.split('\n').slice(0, 5);
      console.error('Stack trace (partial):', stackLines.join('\n'));
    }

    console.log('\n💡 Troubleshooting steps:');
    console.log('1. Check AnalyticsModule import in AppModule');
    console.log('2. Verify AnalyticsController @Controller() decorator');
    console.log('3. Ensure all endpoint @Get() decorators are present');
    console.log('4. Confirm server can compile TypeScript');
    console.log('5. Check for any circular dependencies');
  }
}

// Helper function to extract module name from path
function getModuleFromPath(path: string): string {
  if (!path) return 'unknown';

  // Remove prefix
  let cleanPath = path;
  if (cleanPath.startsWith('/api/v1/')) {
    cleanPath = cleanPath.substring('/api/v1/'.length);
  } else if (cleanPath.startsWith('/')) {
    cleanPath = cleanPath.substring(1);
  }

  // Extract first segment
  const segments = cleanPath.split('/');
  if (segments.length > 0 && segments[0]) {
    return segments[0];
  }

  return 'root';
}

// Helper function to validate analytics route
function validateAnalyticsRoute(route: { method: string; path: string }): boolean {
  // Must have correct prefix
  if (!route.path.startsWith('/api/v1/analytics/')) {
    return false;
  }

  // Must be GET method (for analytics read endpoints)
  if (route.method !== 'GET') {
    return false;
  }

  return true;
}

// Run if this file is executed directly
if (require.main === module) {
  checkAnalyticsRoutes().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

// Export for potential reuse
export { checkAnalyticsRoutes };
