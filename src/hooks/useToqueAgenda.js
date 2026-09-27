import { useEffect, useRef } from "react";

export const PRESSAO_LONGA_AGENDA = 250;

export default function useToqueAgenda({ habilitado, aoSelecionar }) {
  const inicio = useRef(null);
  const grade = useRef(null);

  useEffect(() => {
    const elemento = grade.current;
    if (!elemento || !habilitado) return undefined;
    const cancelar = () => { inicio.current = null; };
    function iniciar(event) {
      cancelar();
      if (event.touches.length !== 1 || event.target.closest(".rbc-event, button, a, input")) return;
      const coluna = event.target.closest(".rbc-day-slot");
      if (!coluna) return;
      const toque = event.touches[0];
      const slot = [...coluna.querySelectorAll("[data-agenda-horario]")].find(item => {
        const rect = item.getBoundingClientRect();
        return toque.clientY >= rect.top && toque.clientY < rect.bottom;
      });
      if (slot) inicio.current = { id: toque.identifier, x: toque.clientX, y: toque.clientY, timestamp: event.timeStamp, data: slot.dataset.agendaHorario };
    }
    function mover(event) {
      const anterior = inicio.current;
      const toque = event.touches[0];
      if (!anterior || event.touches.length !== 1 || Math.hypot(toque.clientX - anterior.x, toque.clientY - anterior.y) > 8) cancelar();
    }
    function finalizar(event) {
      const anterior = inicio.current;
      cancelar();
      if (!anterior || event.touches.length || event.timeStamp - anterior.timestamp >= PRESSAO_LONGA_AGENDA) return;
      const toque = [...event.changedTouches].find(item => item.identifier === anterior.id);
      if (!toque || Math.hypot(toque.clientX - anterior.x, toque.clientY - anterior.y) > 8) return;
      if (event.cancelable) event.preventDefault();
      const start = new Date(anterior.data);
      aoSelecionar({ start, end: new Date(start.getTime() + 30 * 60000), action: "click" });
    }
    elemento.addEventListener("touchstart", iniciar, { capture: true, passive: true });
    elemento.addEventListener("touchmove", mover, { capture: true, passive: true });
    elemento.addEventListener("touchend", finalizar, { capture: true, passive: false });
    return () => {
      elemento.removeEventListener("touchstart", iniciar, true);
      elemento.removeEventListener("touchmove", mover, true);
      elemento.removeEventListener("touchend", finalizar, true);
    };
  }, [habilitado, aoSelecionar]);

  return { ref: grade };
}
