import { useEffect, useId, useRef, useState } from "react";
import "./fotos.css";

export default function FotoEditor({ value, onChange, label = "Foto", circular = false, disabled = false }) {
  const id = useId();
  const arquivo = useRef(null);
  const canvas = useRef(null);
  const [imagem, setImagem] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [giro, setGiro] = useState(0);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!imagem || !canvas.current) return;
    const ctx = canvas.current.getContext("2d");
    const lado = 512;
    const trocado = giro % 180 !== 0;
    const largura = trocado ? imagem.height : imagem.width;
    const altura = trocado ? imagem.width : imagem.height;
    const escala = Math.max(lado / largura, lado / altura) * zoom;
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, lado, lado);
    ctx.translate(lado / 2 + x * (largura * escala - lado) / 2, lado / 2 + y * (altura * escala - lado) / 2);
    ctx.rotate(giro * Math.PI / 180);
    ctx.drawImage(imagem, -imagem.width * escala / 2, -imagem.height * escala / 2, imagem.width * escala, imagem.height * escala);
    ctx.restore();
  }, [imagem, zoom, x, y, giro]);

  function editar(src) {
    setErro("");
    const img = new Image();
    img.onload = () => {
      if (img.width * img.height > 40_000_000) { setErro("Escolha uma imagem de até 40 megapixels."); return; }
      setImagem(img); setZoom(1); setX(0); setY(0); setGiro(0);
    };
    img.onerror = () => setErro("Não foi possível abrir essa imagem. Escolha um arquivo JPG, PNG ou WebP.");
    img.src = src;
  }

  function selecionar(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setErro("Use uma foto JPG, PNG ou WebP de até 10 MB."); return;
    }
    const reader = new FileReader();
    reader.onload = () => editar(reader.result);
    reader.onerror = () => setErro("Não foi possível ler o arquivo.");
    reader.readAsDataURL(file);
  }

  return <section className="foto-editor" aria-label={label}>
    <div className="foto-editor-summary">
      <div className={`foto-preview ${circular ? "round" : ""}`}>
        {value ? <img src={value} alt={label} /> : <svg viewBox="0 0 24 24" width="30" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="8" cy="8" r="1.5" /><path d="m4 18 5-5 3 3 4-6 5 7" /></svg>}
      </div>
      <div><strong>{label}</strong><p>JPG, PNG ou WebP. Recorte e ajuste antes de salvar.</p>
        <input ref={arquivo} id={id} type="file" accept="image/jpeg,image/png,image/webp" onChange={selecionar} hidden disabled={disabled} />
        <div className="foto-actions">
          <button type="button" className="btn btn-outline-primary btn-sm" disabled={disabled} onClick={() => arquivo.current.click()}>{value ? "Trocar foto" : "Adicionar foto"}</button>
          {value && <><button type="button" className="btn btn-outline-secondary btn-sm" disabled={disabled} onClick={() => editar(value)}>Editar foto</button><button type="button" className="btn btn-outline-danger btn-sm" disabled={disabled} onClick={() => { onChange(null); setImagem(null); }}>Remover foto</button></>}
        </div>
      </div>
    </div>
    {erro && <p className="text-danger mt-2" role="alert">{erro}</p>}
    {imagem && <div className="foto-crop" role="group" aria-label="Ajustar enquadramento">
      <canvas ref={canvas} width="512" height="512" className={circular ? "round" : ""} aria-label="Prévia do recorte" />
      <div className="foto-crop-controls">
        <h3>Ajustar foto</h3><p>Ajuste o zoom e a posição para escolher o recorte.</p>
        <label>Zoom<input type="range" min="1" max="3" step="0.01" value={zoom} onChange={e => setZoom(Number(e.target.value))} /></label>
        <label>Posição horizontal<input type="range" min="-1" max="1" step="0.01" value={x} onChange={e => setX(Number(e.target.value))} /></label>
        <label>Posição vertical<input type="range" min="-1" max="1" step="0.01" value={y} onChange={e => setY(Number(e.target.value))} /></label>
        <div className="foto-actions"><button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => { setGiro((giro + 90) % 360); setX(0); setY(0); }}>Girar 90°</button><button className="btn btn-light btn-sm" type="button" onClick={() => setImagem(null)}>Cancelar recorte</button><button className="btn btn-primary btn-sm" type="button" onClick={() => { onChange(canvas.current.toDataURL("image/jpeg", 0.86)); setImagem(null); }}>Aplicar recorte</button></div>
      </div>
    </div>}
  </section>;
}
