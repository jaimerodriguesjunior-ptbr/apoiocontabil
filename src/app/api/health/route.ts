import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * GET /api/health
 *
 * Endpoint leve para manter o Supabase free tier "acordado".
 * Chamado pelo GitHub Actions a cada 3 dias via cron job.
 *
 * Retorna 200 se o banco responder corretamente, 500 caso contrário.
 */
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { status: 'error', message: 'Variáveis de ambiente do Supabase não configuradas.' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Ping leve: limit(1) é o mínimo possível — só acorda o banco, não lê dados reais
    const { error } = await supabase.from('clients').select('id').limit(1);

    if (error) {
      console.error('[health] Supabase ping falhou:', error.message);
      return NextResponse.json(
        { status: 'error', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Supabase está acordado.',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[health] Erro inesperado:', message);
    return NextResponse.json(
      { status: 'error', message },
      { status: 500 }
    );
  }
}
