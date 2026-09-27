export function agendadoOnline(atendimento) {
  return atendimento?.agendadoOnline ?? Boolean(atendimento?.chaveReservaOnline);
}

export default function OrigemAgendamento({ atendimento }) {
  if (!agendadoOnline(atendimento)) return null;
  return <span className="agenda-origem-online" title="Agendamento feito pelo cliente pelo link online">Agendado online</span>;
}
