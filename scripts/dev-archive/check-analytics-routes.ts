import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function checkAnalyticsRoutes() {
  console.log('🔍 Checking Analytics Module Registration...\n');

  try {
    // Create app instance without external dependencies
    const app = await NestFactory.create(AppModule, {
      logger: false, // Disable logging for cleaner output
    });

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

    // Check router stack
    if (Array.isArray(router.stack)) {
      router.stack.forEach((layer) => {
        // Check for route layers
        if (layer.route && layer.route.path && layer.route.stack && layer.route.stack[0]) {
          routes.push({
            method: layer.route.stack[0].method?.toUpperCase() || 'UNKNOWN',
            path: layer.route.path,
          });
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
                routes.push({
                  method: nestedLayer.route.stack[0].method?.toUpperCase() || 'UNKNOWN',
                  path: nestedLayer.route.path,
                });
              }
            });
          }
        }
      });
    }

    console.log(`📊 Total routes found: ${routes.length}\n`);

    // Find analytics routes
    const analyticsRoutes = routes.filter((route) => route.path.includes('analytics'));

    if (analyticsRoutes.length === 0) {
      console.log('❌ NO ANALYTICS ROUTES FOUND!\n');
      console.log('Possible issues:');
      console.log('1. AnalyticsModule not imported in AppModule');
      console.log('2. AnalyticsController not properly configured');
      console.log('3. Server not picking up new routes');

      console.log('\n📋 First 20 routes found:');
      routes.slice(0, 20).forEach((route, i) => {
        console.log(`  ${i + 1}. ${route.method} ${route.path}`);
      });
    } else {
      console.log(`✅ Found ${analyticsRoutes.length} analytics route(s):\n`);

      analyticsRoutes.forEach((route, i) => {
        console.log(`  ${i + 1}. ${route.method} ${route.path}`);
      });

      // Check for expected endpoints
      const expected = [
        '/api/v1/analytics/deals',
        '/api/v1/analytics/revenue',
        '/api/v1/analytics/pipeline',
        '/api/v1/analytics/activity',
        '/api/v1/analytics/export',
      ];

      console.log('\n✅ Expected endpoints check:');
      expected.forEach((endpoint) => {
        const found = analyticsRoutes.some(
          (route) => route.path === endpoint || route.path.includes(endpoint),
        );
        console.log(`  ${found ? '✓' : '✗'} ${endpoint}`);
      });
    }

    await app.close();
    console.log('\n✅ Check completed');
  } catch (error) {
    console.error('❌ Error during check:', error.message);

    if (error.stack) {
      // Show only first few lines of stack trace
      const stackLines = error.stack.split('\n').slice(0, 5);
      console.error('Stack trace (partial):', stackLines.join('\n'));
    }

    console.log('\n💡 Troubleshooting:');
    console.log('1. Make sure AnalyticsModule is imported in AppModule');
    console.log('2. Check if AnalyticsController is properly decorated');
    console.log('3. Verify server is running on port 3001');
  }
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
