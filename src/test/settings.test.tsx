import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Route } from '@/routes/_authenticated/configuracoes';
const pref = vi.hoisted(() => ({ tema: 'auto', semana_inicia: 1, dia_inicio_mes: 15, pagamento_padrao: 'pix', pin_tema: 'galaxia', pin_tempo_bloqueio: 300, notif_ativas: false, lembrete_manha: true, lembrete_tarde: false, lembrete_noite: true, lembrete_manha_horario: '09:07', lembrete_tarde_horario: '14:00', lembrete_noite_horario: '20:00' }));
vi.mock('@/lib/preferences', () => ({ accountQuery: {}, usePreferences: () => ({ config: pref }), useSavePreferences: () => ({ mutateAsync: vi.fn() }) }));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: { id: 'user' } }), useQueryClient: () => ({ setQueryData: vi.fn() }) }));
vi.mock('@/lib/push.functions', () => ({ enviarTeste: vi.fn() }));
vi.mock('@/lib/push-client', () => ({ isStandalone: () => false, isIOS: () => false, statusPush: async () => ({ ok: false, texto: 'Não inscrito' }), assinarPush: vi.fn(), cancelarPush: vi.fn() }));
vi.mock('@/components/DeviceSecuritySettings', () => ({ DeviceSecuritySettings: () => <p>Controles de segurança preservados</p> }));
vi.mock('@/components/BottomSheet', () => ({ BottomSheet: () => null }));
vi.mock('@/components/ConfirmSheet', () => ({ ConfirmSheet: () => null }));
afterEach(cleanup);
describe('Settings existing card organization', () => {
  it('keeps the required order, open/closed defaults and all saved choices', () => {
    const Component = Route.options.component;
    if (typeof Component !== 'function') throw Error('Missing settings component');
    render(<Component />);
    expect(screen.getAllByRole('heading', { level: 2 }).map(e => e.textContent)).toEqual(['Aparência', 'Preferências', 'Segurança do aparelho', 'Notificações', 'Dados']);
    expect(screen.queryByText('Aplicativo')).not.toBeInTheDocument();
    for (const name of ['Preferências', 'Segurança do aparelho', 'Notificações']) expect(screen.getByRole('button', { name })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Claro')).toBeVisible(); expect(screen.getByText('Apagar todos os gastos')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Preferências' })); expect(screen.getByText('Dia 15')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Preferências' })); expect(screen.getByText('Dia 15')).not.toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Notificações' })); expect(screen.getByText('09:07')).toBeVisible();
    expect(pref.pin_tema).toBe('galaxia'); expect(pref.pin_tempo_bloqueio).toBe(300); expect(pref.lembrete_tarde).toBe(false);
  });
});