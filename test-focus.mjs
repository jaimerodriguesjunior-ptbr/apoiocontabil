import { readFileSync, appendFileSync } from 'fs';

// Helper to load .env.local
try {
    const envFile = readFileSync('.env.local', 'utf-8');
    for (const line of envFile.split('\n')) {
        if (line.trim() && !line.startsWith('#')) {
            const parts = line.split('=');
            if (parts.length >= 2) {
                process.env[parts[0].trim()] = parts.slice(1).join('=').replace(/^"|"$/g, '').trim();
            }
        }
    }
} catch (e) {
    console.log('No .env.local found');
}

const principalToken = process.env.FOCUSNFE_PRINCIPAL;

if (!principalToken) {
    console.error("No FOCUSNFE_PRINCIPAL found in .env.local");
    process.exit(1);
}

// Basic Auth requires username=token, password=empty
const authHeader = 'Basic ' + Buffer.from(principalToken + ':').toString('base64');

async function testFocus() {
    console.log('Fetching registered companies using Principal Token...');
    const res = await fetch('https://api.focusnfe.com.br/v2/empresas', {
        method: 'GET',
        headers: {
            'Authorization': authHeader
        }
    });

    if (!res.ok) {
        console.error('Failed to fetch:', res.status, await res.text());
        return;
    }

    const data = await res.json();
    console.log('Companies found:', data.empresas?.length || 0);

    if (data.empresas && data.empresas.length > 0) {
        const firstCompany = data.empresas[0];
        console.log('\n--- Amplotec Company Data ---');
        console.log(`CNPJ: ${firstCompany.cnpj}`);
        console.log(`Token Producao: ${firstCompany.token_producao}`);
        console.log(`Token Homologacao: ${firstCompany.token_homologacao}`);

        // Auto-append to .env.local if not there
        const envFile = readFileSync('.env.local', 'utf-8');
        let appendStr = '';
        if (!envFile.includes('FOCUSNFE_PROD_TOKEN=')) {
            appendStr += `\nFOCUSNFE_PROD_TOKEN=${firstCompany.token_producao}`;
        }
        if (!envFile.includes('FOCUSNFE_HOM_TOKEN=')) {
            appendStr += `\nFOCUSNFE_HOM_TOKEN=${firstCompany.token_homologacao}`;
        }

        if (appendStr) {
            appendFileSync('.env.local', appendStr);
            console.log('\nSuccessfully auto-appended tokens to .env.local!');
        } else {
            console.log('\nTokens already exist in .env.local');
        }
        return;
    }

    console.log('\nNo companies registered yet. Did you save the company in the Focus NFe panel?');
}

testFocus();
