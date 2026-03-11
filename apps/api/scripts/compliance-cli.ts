// apps/api/scripts/compliance-cli.ts
import { Command } from 'commander';
import { NestFactory } from '@nestjs/core';
import { ComplianceModule } from '../src/shared/compliance/compliance.module';
import { Soc2EvidenceService } from '../src/shared/compliance/soc2/soc2-evidence.service';
import { EvidenceStorageService } from '../src/shared/compliance/evidence-storage/evidence-storage.service';
import { Soc2ControlsService } from '../src/shared/compliance/soc2/soc2-controls.service';

const program = new Command();

program
  .name('compliance-cli')
  .description('SOC 2 Compliance Evidence Management CLI')
  .version('1.0.0');

program
  .command('collect')
  .description('Collect SOC 2 evidence')
  .option('-s, --store', 'Store evidence with integrity verification', false)
  .option('-v, --verify', 'Verify controls after collection', false)
  .action(async (options) => {
    console.log('Collecting SOC 2 evidence...\n');

    // Create app with ONLY ComplianceModule (it imports ConfigModule and PrismaModule)
    const app = await NestFactory.createApplicationContext(ComplianceModule);

    try {
      const evidenceService = app.get(Soc2EvidenceService);

      // Collect evidence
      console.log('��� Collecting evidence...');
      const evidence = await evidenceService.collectAllEvidence();
      console.log(`✅ Collected ${evidence.length} evidence items`);

      // Show summary
      const byCriteria = evidence.reduce(
        (acc: Record<string, number>, item) => {
          acc[item.criteria] = (acc[item.criteria] || 0) + 1;
          return acc;
        },
        {},
      );

      console.log('\n��� Evidence Summary:');
      Object.entries(byCriteria).forEach(([criteria, count]) => {
        console.log(`  ${criteria}: ${count} items`);
      });

      console.log('\n��� Controls collected:');
      evidence.forEach((item) => {
        console.log(`  ${item.controlId}: ${item.controlName}`);
      });

      // Store evidence if requested
      if (options.store) {
        console.log('\n��� Storing evidence with integrity...');
        const storageService = app.get(EvidenceStorageService);

        const storedEvidence = await storageService.storeEvidenceWithIntegrity({
          collectionId: `manual-${Date.now()}`,
          totalControls: evidence.length,
          byCriteria,
          results: evidence,
          collectedBy: 'CLI',
          timestamp: new Date(),
        });

        console.log(
          `✅ Evidence stored with hash: ${storedEvidence.evidenceHash.substring(0, 16)}...`,
        );
        console.log(`   Collection ID: ${storedEvidence.collectionId}`);
        console.log(
          `   Stored at: ${storedEvidence.collectedAt.toISOString()}`,
        );
      }

      // Verify controls if requested
      if (options.verify) {
        console.log('\n��� Verifying controls...');
        const controlsService = app.get(Soc2ControlsService);

        for (const evidenceItem of evidence) {
          const result = await controlsService.verifyControl(
            evidenceItem.controlId,
            evidenceItem,
            'CLI',
          );
          console.log(
            `  ${result.controlId}: ${result.status} (${result.evidenceCount} evidence)`,
          );
        }

        // Get verification summary
        const summary = await controlsService.getControlStatusSummary(30);
        console.log(`\n��� Verification Summary:`);
        console.log(`  Overall status: ${summary.overallStatus}`);
        console.log(`  Total controls: ${summary.totalControls}`);
        console.log(`  Verified: ${summary.verifiedControls}`);
      }

      console.log('\n��� Evidence collection completed successfully!');
    } catch (error: any) {
      console.error('❌ Error:', error?.message || 'Unknown error');
      if (error.stack) {
        console.error(
          'Stack (first 3 lines):',
          error.stack.split('\n').slice(0, 3).join('\n'),
        );
      }
      process.exit(1);
    } finally {
      await app.close();
    }
  });

program
  .command('gap-analysis')
  .description('Perform gap analysis')
  .action(async () => {
    console.log('Performing SOC 2 gap analysis...\n');

    const app = await NestFactory.createApplicationContext(ComplianceModule);

    try {
      const evidenceService = app.get(Soc2EvidenceService);

      console.log('��� Performing gap analysis...');
      const gaps = await evidenceService.performGapAnalysis();

      console.log(`✅ Analyzed ${gaps.length} controls`);

      const completed = gaps.filter((g) => g.status === 'COMPLETE').length;
      const partial = gaps.filter((g) => g.status === 'PARTIAL').length;
      const missing = gaps.filter((g) => g.status === 'MISSING').length;

      console.log('\n��� Gap Analysis Results:');
      console.log(`  ✅ COMPLETE: ${completed}`);
      console.log(`  ⚠️  PARTIAL: ${partial}`);
      console.log(`  ❌ MISSING: ${missing}`);

      // Show missing controls
      const missingControls = gaps.filter((g) => g.status === 'MISSING');
      if (missingControls.length > 0) {
        console.log('\n⚠️  Missing Controls:');
        missingControls.forEach((control) => {
          console.log(`  • ${control.controlId}: ${control.controlName}`);
          console.log(
            `    Risk: ${control.riskLevel} - ${control.recommendation}`,
          );
        });
      }

      // Show partial controls
      const partialControls = gaps.filter((g) => g.status === 'PARTIAL');
      if (partialControls.length > 0) {
        console.log('\n��� Controls Needing Improvement:');
        partialControls.forEach((control) => {
          console.log(`  • ${control.controlId}: ${control.controlName}`);
          console.log(
            `    Missing evidence: ${control.missingEvidence.join(', ')}`,
          );
        });
      }
    } catch (error: any) {
      console.error('❌ Error:', error?.message || 'Unknown error');
      process.exit(1);
    } finally {
      await app.close();
    }
  });

program
  .command('verify-chain')
  .description('Verify evidence chain integrity')
  .action(async () => {
    console.log('Verifying evidence chain integrity...\n');

    const app = await NestFactory.createApplicationContext(ComplianceModule);

    try {
      const storageService = app.get(EvidenceStorageService);

      console.log('��� Verifying evidence chain...');
      const result = await storageService.verifyEvidenceChain();

      if (result.valid) {
        console.log(`✅ Evidence chain is VALID`);
        console.log(`   Chain length: ${result.chainLength} entries`);
      } else {
        console.log(`❌ Evidence chain is INVALID`);
        console.log(`   Issues: ${result.issues.join(', ')}`);
      }

      // Show recent collections
      console.log('\n��� Recent evidence collections:');
      const recentCollections = await storageService.getRecentCollections(5);

      if (recentCollections.length === 0) {
        console.log('  No evidence collections found');
      } else {
        recentCollections.forEach((collection, index) => {
          console.log(`  ${index + 1}. ${collection.collectionId}`);
          console.log(
            `     Collected: ${new Date(collection.collectedAt).toLocaleString()}`,
          );
          console.log(`     Controls: ${collection.totalControls}`);
          console.log(`     Status: ${collection.status}`);
          if (collection.evidenceChain?.[0]?.evidenceHash) {
            console.log(
              `     Hash: ${collection.evidenceChain[0].evidenceHash.substring(0, 16)}...`,
            );
          }
        });
      }
    } catch (error: any) {
      console.error('❌ Error:', error?.message || 'Unknown error');
      process.exit(1);
    } finally {
      await app.close();
    }
  });

program
  .command('status')
  .description('Show compliance status')
  .action(async () => {
    console.log('Checking compliance status...\n');

    const app = await NestFactory.createApplicationContext(ComplianceModule);

    try {
      const evidenceService = app.get(Soc2EvidenceService);
      const controlsService = app.get(Soc2ControlsService);
      const storageService = app.get(EvidenceStorageService);

      // Get evidence collection history
      console.log('��� Evidence Collection Status:');
      const history = await evidenceService.getCollectionHistory(1);
      if (history.length > 0) {
        console.log(
          `  Last collection: ${new Date(history[0].collectedAt).toLocaleString()}`,
        );
        console.log(`  Controls collected: ${history[0].totalControls}`);
      } else {
        console.log('  No evidence collections yet');
      }

      // Get control verification status
      console.log('\n��� Control Verification Status:');
      const summary = await controlsService.getControlStatusSummary(30);
      console.log(`  Overall: ${summary.overallStatus}`);
      console.log(
        `  Verified controls: ${summary.verifiedControls}/${summary.totalControls}`,
      );

      // Get chain status
      console.log('\n��� Evidence Chain Status:');
      const chainResult = await storageService.verifyEvidenceChain();
      console.log(`  Chain valid: ${chainResult.valid ? '✅' : '❌'}`);
      console.log(`  Chain length: ${chainResult.chainLength}`);

      console.log('\n��� SOC 2 Readiness Status:');
      const readiness =
        (summary.verifiedControls / summary.totalControls) * 100;
      console.log(`  ${readiness.toFixed(1)}% complete`);

      if (readiness >= 80) {
        console.log('  ✅ Ready for SOC 2 Type I audit');
      } else if (readiness >= 50) {
        console.log('  ⚠️  Partial readiness - continue implementation');
      } else {
        console.log('  ❌ Needs significant work before audit');
      }
    } catch (error: any) {
      console.error('❌ Error:', error?.message || 'Unknown error');
      process.exit(1);
    } finally {
      await app.close();
    }
  });

program.parse(process.argv);
