import { useEffect, useRef, useState } from "react";
import "./leitor-codigo-camera.css";

function mensagemCamera(error) {
  if (["NotAllowedError", "SecurityError"].includes(error?.name)) return "Permita o acesso à câmera nas configurações deste site e tente novamente.";
  if (["NotFoundError", "DevicesNotFoundError"].includes(error?.name)) return "Nenhuma câmera foi encontrada neste aparelho.";
  if (["NotReadableError", "TrackStartError"].includes(error?.name)) return "A câmera está sendo usada por outro aplicativo.";
  return "Não foi possível iniciar a câmera. Você ainda pode digitar o código.";
}

export default function LeitorCodigoCamera({ onCodigo, onFechar }) {
  const dialog = useRef(null);
  const video = useRef(null);
  const callbacks = useRef({ onCodigo, onFechar });
  callbacks.current = { onCodigo, onFechar };
  const [erro, setErro] = useState("");
  const [pronto, setPronto] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);

  useEffect(() => {
    let encerrado = false;
    let lido = false;
    let stream;
    let controles;
    let ultimoCodigo = "";
    let leituras = 0;
    const preview = video.current;
    const parar = () => {
      controles?.stop();
      stream?.getTracks().forEach(track => track.stop());
      if (preview) preview.srcObject = null;
    };

    async function iniciar() {
      setErro("");
      setPronto(false);
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setErro("A leitura pela câmera precisa de uma conexão segura (HTTPS).");
        return;
      }
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import("@zxing/browser"), import("@zxing/library")
        ]);
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" } } });
        if (encerrado) return parar();
        const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E, BarcodeFormat.CODE_128, BarcodeFormat.CODE_39,
          BarcodeFormat.ITF, BarcodeFormat.CODABAR
        ]]]);
        const leitor = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 });
        controles = await leitor.decodeFromStream(stream, preview, (result, _, controle) => {
          if (encerrado || lido || !result) return;
          const codigo = result.getText().trim();
          leituras = codigo === ultimoCodigo ? leituras + 1 : 1;
          ultimoCodigo = codigo;
          if (!codigo || leituras < 2) return;
          lido = true;
          controle.stop();
          parar();
          callbacks.current.onCodigo(codigo);
        });
        setPronto(true);
      } catch (error) {
        parar();
        if (!encerrado) setErro(mensagemCamera(error));
      }
    }

    iniciar();
    return () => { encerrado = true; parar(); };
  }, [tentativa]);

  return <dialog ref={dialog} className="leitor-camera" onCancel={event => { event.preventDefault(); onFechar(); }}>
    <header><div><h2>Ler código pela câmera</h2><p>Aponte para o código de barras do produto.</p></div>
      <button type="button" className="btn-close" aria-label="Fechar câmera" onClick={onFechar} /></header>
    <div className="leitor-camera-preview" hidden={!!erro}><video ref={video} muted autoPlay playsInline /><div className="leitor-camera-mira" /></div>
    {erro ? <div className="leitor-camera-aviso" role="alert"><strong>Atenção</strong><p>{erro}</p></div>
      : <p role="status">{pronto ? "Mantenha o código visível até a leitura." : "Iniciando câmera..."}</p>}
    <footer>{erro && <button type="button" className="btn btn-primary" onClick={() => setTentativa(x => x + 1)}>Tentar novamente</button>}
      <button type="button" className="btn btn-outline-secondary" onClick={onFechar}>Digitar código</button></footer>
  </dialog>;
}
