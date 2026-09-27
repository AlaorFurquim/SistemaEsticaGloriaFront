import { useEffect, useState } from "react";
import { obterBranding } from "../utils/branding";

export default function useBranding() {
  const [branding, setBranding] = useState(obterBranding);
  useEffect(() => {
    const atualizar = () => setBranding(obterBranding());
    window.addEventListener("brandingAtualizado", atualizar);
    return () => window.removeEventListener("brandingAtualizado", atualizar);
  }, []);
  return branding;
}
