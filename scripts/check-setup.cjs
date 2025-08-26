const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function checkSetup() {
    console.log('🔍 Vectre CMS Setup Checker');
    console.log('================================');
    console.log('');

    let allGood = true;
    const issues = [];
    const instructions = [];

    // 1. Check Node.js and npm
    console.log('📦 Checking Prerequisites...');
    try {
        const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
        const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
        console.log(`   ✅ Node.js: ${nodeVersion}`);
        console.log(`   ✅ npm: ${npmVersion}`);
    } catch (error) {
        console.log('   ❌ Node.js or npm not found');
        allGood = false;
        issues.push('Node.js/npm not installed');
        instructions.push('📦 Install Node.js from https://nodejs.org/');
    }

    // 2. Check PostgreSQL
    console.log('');
    console.log('🗄️  Checking Database...');
    let postgresFound = false;
    
    try {
        const psqlVersion = execSync('psql --version', { encoding: 'utf8' }).trim();
        console.log(`   ✅ PostgreSQL: ${psqlVersion}`);
        postgresFound = true;
    } catch (error) {
        // On Windows, PostgreSQL might not be in PATH - check common installation directories
        const commonPaths = [
            'C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe',
            'C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe',
            'C:\\Program Files\\PostgreSQL\\15\\bin\\psql.exe',
            'C:\\Program Files\\PostgreSQL\\14\\bin\\psql.exe',
            'C:\\Program Files\\PostgreSQL\\13\\bin\\psql.exe',
            'C:\\Program Files\\PostgreSQL\\12\\bin\\psql.exe',
            'C:\\Program Files (x86)\\PostgreSQL\\17\\bin\\psql.exe',
            'C:\\Program Files (x86)\\PostgreSQL\\16\\bin\\psql.exe',
            'C:\\Program Files (x86)\\PostgreSQL\\15\\bin\\psql.exe',
            'C:\\Program Files (x86)\\PostgreSQL\\14\\bin\\psql.exe',
            'C:\\Program Files (x86)\\PostgreSQL\\13\\bin\\psql.exe',
            'C:\\Program Files (x86)\\PostgreSQL\\12\\bin\\psql.exe'
        ];
        
        for (const psqlPath of commonPaths) {
            if (fs.existsSync(psqlPath)) {
                try {
                    // Use proper command execution for Windows
                    const command = process.platform === 'win32' ? 
                        `powershell "& '${psqlPath}' --version"` : 
                        `"${psqlPath}" --version`;
                    const version = execSync(command, { encoding: 'utf8' }).trim();
                    console.log(`   ✅ PostgreSQL: ${version}`);
                    console.log(`   💡 Found at: ${psqlPath}`);
                    console.log(`   ⚠️  Note: psql not in PATH. Add PostgreSQL bin directory to PATH for easier access.`);
                    postgresFound = true;
                    break;
                } catch (e) {
                    // Continue checking other paths
                }
            }
        }
        
        // Additional check: look for PostgreSQL service on Windows
        if (!postgresFound && process.platform === 'win32') {
            try {
                const services = execSync('powershell "Get-Service | Where-Object {$_.Name -like \'*postgres*\'} | Select-Object -ExpandProperty Name"', { encoding: 'utf8' });
                if (services.trim()) {
                    console.log(`   ✅ PostgreSQL service detected: ${services.trim()}`);
                    console.log(`   💡 PostgreSQL is installed but psql command not accessible`);
                    console.log(`   ⚠️  Add PostgreSQL bin directory to your system PATH`);
                    postgresFound = true;
                }
            } catch (serviceError) {
                // Service check failed, continue
            }
        }
        
        if (!postgresFound) {
            console.log('   ❌ PostgreSQL not found');
            allGood = false;
            issues.push('PostgreSQL not installed or not accessible');
            instructions.push('🗄️  Install PostgreSQL from https://www.postgresql.org/download/');
            instructions.push('🗄️  Or add PostgreSQL bin directory to your system PATH');
        }
    }

    // 3. Check node_modules
    console.log('');
    console.log('📁 Checking Dependencies...');
    if (fs.existsSync('node_modules') && fs.existsSync('package-lock.json')) {
        console.log('   ✅ Dependencies installed');
    } else {
        console.log('   ❌ Dependencies not installed');
        allGood = false;
        issues.push('Node.js dependencies missing');
        instructions.push('📁 Run: npm install');
    }

    // 4. Check .env file
    console.log('');
    console.log('⚙️  Checking Configuration...');
    const envPath = path.join(process.cwd(), '.env');
    const envExamplePath = path.join(process.cwd(), '.env.example');

    if (!fs.existsSync(envPath)) {
        console.log('   ❌ .env file not found');
        allGood = false;
        issues.push('.env file missing');
        
        if (fs.existsSync(envExamplePath)) {
            instructions.push('⚙️  Copy .env.example to .env: cp .env.example .env');
            instructions.push('⚙️  Edit .env file with your database credentials');
        } else {
            instructions.push('⚙️  Create .env file with database configuration');
        }
    } else {
        console.log('   ✅ .env file exists');
        
        // Check .env configuration
        const envContent = fs.readFileSync(envPath, 'utf8');
        const requiredVars = [
            { name: 'DB_HOST', example: 'localhost' },
            { name: 'DB_PORT', example: '5432' },
            { name: 'DB_NAME', example: 'vectre_cms' },
            { name: 'DB_USER', example: 'postgres' },
            { name: 'DB_PASS', example: 'your_password' },
            { name: 'JWT_SECRET', example: 'your-long-secret-key' },
            { name: 'PORT', example: '3000' }
        ];
        
        const missingVars = [];
        const emptyVars = [];

        requiredVars.forEach(varInfo => {
            const varName = varInfo.name;
            const line = envContent.split('\n').find(line => line.trim().startsWith(`${varName}=`));
            
            if (!line) {
                missingVars.push(varInfo);
            } else {
                const value = line.split('=')[1]?.trim();
                if (!value || value === '' || value.includes('your_') || value === 'your-password' || value === 'your-secret-key') {
                    emptyVars.push(varInfo);
                }
            }
        });

        if (missingVars.length === 0 && emptyVars.length === 0) {
            console.log('   ✅ All required environment variables configured');
        } else {
            allGood = false;
            
            if (missingVars.length > 0) {
                console.log('   ❌ Missing environment variables:');
                missingVars.forEach(varInfo => {
                    console.log(`      - ${varInfo.name}`);
                });
                issues.push('Missing environment variables in .env');
            }
            
            if (emptyVars.length > 0) {
                console.log('   ⚠️  Environment variables need values:');
                emptyVars.forEach(varInfo => {
                    console.log(`      - ${varInfo.name} (example: ${varInfo.example})`);
                });
                issues.push('Empty environment variables in .env');
            }

            instructions.push('⚙️  Update .env file with proper values:');
            [...missingVars, ...emptyVars].forEach(varInfo => {
                instructions.push(`     ${varInfo.name}=${varInfo.example}`);
            });
        }
    }

    // 5. Check database connection (if .env exists)
    if (fs.existsSync(envPath)) {
        console.log('');
        console.log('🔌 Database Connection...');
        console.log('   ⚠️  Database connection will be tested when you start the app');
        console.log('   💡 Run "npm run dev" to test database connection');
    }

    // 6. Summary and instructions
    console.log('');
    console.log('📋 Summary');
    console.log('================================');
    
    if (allGood) {
        console.log('🎉 Everything looks good!');
        console.log('');
        console.log('🚀 Ready to start:');
        console.log('   npm run dev    (development mode)');
        console.log('   npm start      (production mode)');
        console.log('');
        console.log('🧪 Test your setup:');
        console.log('   curl http://localhost:3000/health');
        console.log('');
        console.log('📚 The application will automatically create database tables on first run.');
    } else {
        console.log('❌ Issues found that need to be resolved:');
        issues.forEach((issue, index) => {
            console.log(`   ${index + 1}. ${issue}`);
        });
        
        console.log('');
        console.log('🔧 Instructions to fix:');
        instructions.forEach((instruction, index) => {
            console.log(`   ${index + 1}. ${instruction}`);
        });

        console.log('');
        console.log('� Additional Setup Steps:');
        console.log('   1. Create PostgreSQL database:');
        console.log('      psql -U postgres -c "CREATE DATABASE vectre_cms;"');
        console.log('   2. Generate JWT secret:');
        console.log('      node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
        console.log('   3. After fixing issues, run: npm run check');
        console.log('   4. Then start with: npm run dev');
    }

    console.log('');
    console.log('📖 For detailed setup instructions, see README.md');
    
    process.exit(allGood ? 0 : 1);
}

checkSetup();
