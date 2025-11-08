/**
 * User Journey Validation Script
 * 
 * Tests specific user scenarios to validate documentation UX
 * Requirements: 1.1, 2.1, 3.1
 */

const fs = require('fs');
const path = require('path');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper functions
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    return null;
  }
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(stepNum, description, status) {
  const statusSymbol = status === 'success' ? '✓' : status === 'warning' ? '⚠' : '✗';
  const statusColor = status === 'success' ? 'green' : status === 'warning' ? 'yellow' : 'red';
  log(`  ${stepNum}. ${description}`, statusColor);
  log(`     ${statusSymbol}`, statusColor);
}

// Journey tracking
const journeys = [];

function testJourney(name, description, steps) {
  log(`\n${'='.repeat(80)}`, 'cyan');
  log(`Journey: ${name}`, 'cyan');
  log(`${'='.repeat(80)}`, 'cyan');
  log(`Description: ${description}`, 'blue');
  log('');
  
  const results = {
    name,
    description,
    totalSteps: steps.length,
    successfulSteps: 0,
    failedSteps: 0,
    warningSteps: 0,
    steps: []
  };
  
  steps.forEach((step, index) => {
    const stepResult = step.test();
    results.steps.push({
      number: index + 1,
      description: step.description,
      status: stepResult.status,
      message: stepResult.message
    });
    
    logStep(index + 1, step.description, stepResult.status);
    if (stepResult.message) {
      log(`     ${stepResult.message}`, 'reset');
    }
    
    if (stepResult.status === 'success') {
      results.successfulSteps++;
    } else if (stepResult.status === 'warning') {
      results.warningSteps++;
    } else {
      results.failedSteps++;
    }
  });
  
  const successRate = ((results.successfulSteps / results.totalSteps) * 100).toFixed(1);
  log(`\nJourney Success Rate: ${successRate}%`, successRate >= 75 ? 'green' : 'yellow');
  
  journeys.push(results);
  return results;
}

// ============================================================================
// Journey 1: New Developer First Day
// ============================================================================

testJourney(
  'New Developer First Day',
  'A new developer joins the team and needs to set up their environment',
  [
    {
      description: 'Access main documentation index',
      test: () => {
        const mainReadme = path.join(__dirname, 'README.md');
        if (fileExists(mainReadme)) {
          const content = readFile(mainReadme);
          if (content && content.length > 1000) {
            return { status: 'success', message: 'Main README is comprehensive' };
          }
        }
        return { status: 'failed', message: 'Main README not found or too short' };
      }
    },
    {
      description: 'Find "For New Developers" section',
      test: () => {
        const mainReadme = path.join(__dirname, 'README.md');
        const content = readFile(mainReadme);
        if (content && (content.includes('For New Developers') || content.includes('New to the system'))) {
          return { status: 'success', message: 'New developer section found' };
        }
        return { status: 'failed', message: 'New developer section not found' };
      }
    },
    {
      description: 'Navigate to development environment setup',
      test: () => {
        const devEnvPath = path.join(__dirname, 'getting-started', 'development-environment.md');
        if (fileExists(devEnvPath)) {
          const content = readFile(devEnvPath);
          if (content && content.length > 500) {
            return { status: 'success', message: 'Development environment guide is detailed' };
          }
        }
        return { status: 'failed', message: 'Development environment guide not found or incomplete' };
      }
    },
    {
      description: 'Access system architecture overview',
      test: () => {
        const archPath = path.join(__dirname, 'architecture', 'system-overview.md');
        if (fileExists(archPath)) {
          const content = readFile(archPath);
          if (content && content.length > 500) {
            return { status: 'success', message: 'System overview is comprehensive' };
          }
        }
        return { status: 'failed', message: 'System overview not found or incomplete' };
      }
    },
    {
      description: 'Find coding standards documentation',
      test: () => {
        const codingStandardsPath = path.join(__dirname, 'development', 'coding-standards.md');
        if (fileExists(codingStandardsPath)) {
          return { status: 'success', message: 'Coding standards documentation exists' };
        }
        return { status: 'warning', message: 'Coding standards not yet created (referenced but missing)' };
      }
    },
    {
      description: 'Access testing strategy guide',
      test: () => {
        const testingPath = path.join(__dirname, 'development', 'testing-strategy.md');
        if (fileExists(testingPath)) {
          return { status: 'success', message: 'Testing strategy guide exists' };
        }
        return { status: 'warning', message: 'Testing strategy not yet created (referenced but missing)' };
      }
    },
    {
      description: 'Review component architecture',
      test: () => {
        const componentArchPath = path.join(__dirname, 'architecture', 'component-architecture.md');
        if (fileExists(componentArchPath)) {
          const content = readFile(componentArchPath);
          if (content && content.length > 300) {
            return { status: 'success', message: 'Component architecture documented' };
          }
        }
        return { status: 'failed', message: 'Component architecture not found or incomplete' };
      }
    },
    {
      description: 'Find first task to work on',
      test: () => {
        const featuresPath = path.join(__dirname, 'features', 'README.md');
        if (fileExists(featuresPath)) {
          return { status: 'success', message: 'Features documentation available for task selection' };
        }
        return { status: 'failed', message: 'Features documentation not found' };
      }
    }
  ]
);

// ============================================================================
// Journey 2: System Administrator Deployment
// ============================================================================

testJourney(
  'System Administrator Deployment',
  'A system administrator needs to deploy the application to production',
  [
    {
      description: 'Access main documentation',
      test: () => {
        const mainReadme = path.join(__dirname, 'README.md');
        return fileExists(mainReadme) 
          ? { status: 'success', message: 'Main documentation accessible' }
          : { status: 'failed', message: 'Main documentation not found' };
      }
    },
    {
      description: 'Find administrator-specific tasks',
      test: () => {
        const mainReadme = path.join(__dirname, 'README.md');
        const content = readFile(mainReadme);
        if (content && (content.includes('System Administrator') || content.includes('administrator'))) {
          return { status: 'success', message: 'Administrator tasks section found' };
        }
        return { status: 'failed', message: 'Administrator tasks not clearly identified' };
      }
    },
    {
      description: 'Access deployment overview',
      test: () => {
        const deploymentReadme = path.join(__dirname, 'deployment', 'README.md');
        if (fileExists(deploymentReadme)) {
          const content = readFile(deploymentReadme);
          if (content && content.length > 300) {
            return { status: 'success', message: 'Deployment overview is comprehensive' };
          }
        }
        return { status: 'failed', message: 'Deployment overview not found or incomplete' };
      }
    },
    {
      description: 'Follow deployment guide',
      test: () => {
        const deploymentGuide = path.join(__dirname, 'deployment', 'deployment-guide.md');
        if (fileExists(deploymentGuide)) {
          const content = readFile(deploymentGuide);
          if (content && content.length > 500) {
            return { status: 'success', message: 'Deployment guide is detailed' };
          }
        }
        return { status: 'failed', message: 'Deployment guide not found or incomplete' };
      }
    },
    {
      description: 'Configure environment settings',
      test: () => {
        const envSetupPath = path.join(__dirname, 'deployment', 'environment-setup.md');
        if (fileExists(envSetupPath)) {
          return { status: 'success', message: 'Environment setup guide exists' };
        }
        return { status: 'warning', message: 'Environment setup guide not yet created' };
      }
    },
    {
      description: 'Set up monitoring and logging',
      test: () => {
        const monitoringPath = path.join(__dirname, 'deployment', 'monitoring-logging.md');
        if (fileExists(monitoringPath)) {
          return { status: 'success', message: 'Monitoring guide exists' };
        }
        return { status: 'warning', message: 'Monitoring guide not yet created' };
      }
    },
    {
      description: 'Access troubleshooting guide',
      test: () => {
        const troubleshootingPath = path.join(__dirname, 'deployment', 'troubleshooting.md');
        if (fileExists(troubleshootingPath)) {
          const content = readFile(troubleshootingPath);
          if (content && content.length > 300) {
            return { status: 'success', message: 'Troubleshooting guide is comprehensive' };
          }
        }
        return { status: 'failed', message: 'Troubleshooting guide not found or incomplete' };
      }
    },
    {
      description: 'Review maintenance procedures',
      test: () => {
        const maintenancePath = path.join(__dirname, 'deployment', 'maintenance.md');
        if (fileExists(maintenancePath)) {
          const content = readFile(maintenancePath);
          if (content && content.length > 200) {
            return { status: 'success', message: 'Maintenance procedures documented' };
          }
        }
        return { status: 'failed', message: 'Maintenance procedures not found or incomplete' };
      }
    }
  ]
);

// ============================================================================
// Journey 3: Integration Developer
// ============================================================================

testJourney(
  'Integration Developer Setup',
  'A developer needs to integrate with the booking engine API',
  [
    {
      description: 'Navigate to integrations section',
      test: () => {
        const integrationsReadme = path.join(__dirname, 'integrations', 'README.md');
        if (fileExists(integrationsReadme)) {
          const content = readFile(integrationsReadme);
          if (content && content.length > 300) {
            return { status: 'success', message: 'Integrations overview is comprehensive' };
          }
        }
        return { status: 'failed', message: 'Integrations overview not found or incomplete' };
      }
    },
    {
      description: 'Find booking engine integration docs',
      test: () => {
        const bookingEngineDir = path.join(__dirname, 'integrations', 'booking-engine');
        if (fs.existsSync(bookingEngineDir)) {
          return { status: 'success', message: 'Booking engine integration directory exists' };
        }
        return { status: 'failed', message: 'Booking engine integration directory not found' };
      }
    },
    {
      description: 'Access API specifications',
      test: () => {
        const apiSpecPath = path.join(__dirname, 'integrations', 'booking-engine', 'api-specification.md');
        if (fileExists(apiSpecPath)) {
          const content = readFile(apiSpecPath);
          if (content && content.length > 500) {
            return { status: 'success', message: 'API specifications are detailed' };
          }
        }
        return { status: 'failed', message: 'API specifications not found or incomplete' };
      }
    },
    {
      description: 'Review integration overview',
      test: () => {
        const overviewPath = path.join(__dirname, 'integrations', 'booking-engine', 'overview.md');
        if (fileExists(overviewPath)) {
          const content = readFile(overviewPath);
          if (content && content.length > 300) {
            return { status: 'success', message: 'Integration overview is comprehensive' };
          }
        }
        return { status: 'failed', message: 'Integration overview not found or incomplete' };
      }
    },
    {
      description: 'Find caching strategy documentation',
      test: () => {
        const cachingPath = path.join(__dirname, 'integrations', 'booking-engine', 'caching-strategy.md');
        if (fileExists(cachingPath)) {
          return { status: 'success', message: 'Caching strategy documented' };
        }
        return { status: 'warning', message: 'Caching strategy documentation could be more detailed' };
      }
    },
    {
      description: 'Access integration troubleshooting',
      test: () => {
        const troubleshootingPath = path.join(__dirname, 'integrations', 'troubleshooting.md');
        if (fileExists(troubleshootingPath)) {
          const content = readFile(troubleshootingPath);
          if (content && content.length > 300) {
            return { status: 'success', message: 'Integration troubleshooting guide exists' };
          }
        }
        return { status: 'failed', message: 'Integration troubleshooting not found or incomplete' };
      }
    },
    {
      description: 'Review testing procedures',
      test: () => {
        const testingPath = path.join(__dirname, 'integrations', 'integration-testing.md');
        if (fileExists(testingPath)) {
          return { status: 'success', message: 'Integration testing procedures documented' };
        }
        return { status: 'warning', message: 'Integration testing procedures could be enhanced' };
      }
    }
  ]
);

// ============================================================================
// Journey 4: Business Stakeholder
// ============================================================================

testJourney(
  'Business Stakeholder Feature Review',
  'A business stakeholder wants to understand system capabilities',
  [
    {
      description: 'Access main documentation',
      test: () => {
        const mainReadme = path.join(__dirname, 'README.md');
        return fileExists(mainReadme)
          ? { status: 'success', message: 'Main documentation accessible' }
          : { status: 'failed', message: 'Main documentation not found' };
      }
    },
    {
      description: 'Find business stakeholder section',
      test: () => {
        const mainReadme = path.join(__dirname, 'README.md');
        const content = readFile(mainReadme);
        if (content && (content.includes('Business Stakeholder') || content.includes('stakeholder'))) {
          return { status: 'success', message: 'Business stakeholder section found' };
        }
        return { status: 'warning', message: 'Business stakeholder section could be more prominent' };
      }
    },
    {
      description: 'Navigate to features overview',
      test: () => {
        const featuresReadme = path.join(__dirname, 'features', 'README.md');
        if (fileExists(featuresReadme)) {
          const content = readFile(featuresReadme);
          if (content && content.length > 300) {
            return { status: 'success', message: 'Features overview is comprehensive' };
          }
        }
        return { status: 'failed', message: 'Features overview not found or incomplete' };
      }
    },
    {
      description: 'Review reservation management features',
      test: () => {
        const reservationDir = path.join(__dirname, 'features', 'reservation-management');
        if (fs.existsSync(reservationDir)) {
          return { status: 'success', message: 'Reservation management features documented' };
        }
        return { status: 'failed', message: 'Reservation management documentation not found' };
      }
    },
    {
      description: 'Review client management features',
      test: () => {
        const clientDir = path.join(__dirname, 'features', 'client-management');
        if (fs.existsSync(clientDir)) {
          return { status: 'success', message: 'Client management features documented' };
        }
        return { status: 'failed', message: 'Client management documentation not found' };
      }
    },
    {
      description: 'Understand integration capabilities',
      test: () => {
        const integrationsReadme = path.join(__dirname, 'integrations', 'README.md');
        if (fileExists(integrationsReadme)) {
          return { status: 'success', message: 'Integration capabilities documented' };
        }
        return { status: 'failed', message: 'Integration capabilities not documented' };
      }
    },
    {
      description: 'Check deployment status information',
      test: () => {
        const deploymentReadme = path.join(__dirname, 'deployment', 'README.md');
        if (fileExists(deploymentReadme)) {
          return { status: 'success', message: 'Deployment information accessible' };
        }
        return { status: 'failed', message: 'Deployment information not found' };
      }
    }
  ]
);

// ============================================================================
// Summary Report
// ============================================================================

log('\n' + '='.repeat(80), 'cyan');
log('User Journey Validation Summary', 'cyan');
log('='.repeat(80), 'cyan');
log('');

let totalSteps = 0;
let totalSuccessful = 0;
let totalFailed = 0;
let totalWarnings = 0;

journeys.forEach(journey => {
  totalSteps += journey.totalSteps;
  totalSuccessful += journey.successfulSteps;
  totalFailed += journey.failedSteps;
  totalWarnings += journey.warningSteps;
  
  const successRate = ((journey.successfulSteps / journey.totalSteps) * 100).toFixed(1);
  const color = successRate >= 75 ? 'green' : successRate >= 50 ? 'yellow' : 'red';
  
  log(`${journey.name}: ${successRate}% (${journey.successfulSteps}/${journey.totalSteps})`, color);
});

log('');
log(`Total Steps: ${totalSteps}`, 'blue');
log(`Successful: ${totalSuccessful}`, 'green');
log(`Warnings: ${totalWarnings}`, 'yellow');
log(`Failed: ${totalFailed}`, 'red');

const overallSuccessRate = ((totalSuccessful / totalSteps) * 100).toFixed(1);
log(`\nOverall Success Rate: ${overallSuccessRate}%`, overallSuccessRate >= 75 ? 'green' : 'yellow');

log('');
log('Journey validation complete!', 'cyan');
log('');

// Exit with appropriate code
process.exit(totalFailed > 0 ? 1 : 0);
