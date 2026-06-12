import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileText, X, Loader2, ArrowRight, Globe, Package, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NavBar } from "@/components/landing/NavBar";
import { Footer } from "@/components/landing/Footer";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DESTINATION_COUNTRIES, PRODUCTS } from "@/lib/tariff-data";

type Mode = "document" | "manual";

export default function SimulatorPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("document");
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [simulating, setSimulating] = useState(false);

  // Manual / extracted form fields
  const [hsCode, setHsCode] = useState("");
  const [productName, setProductName] = useState("");
  const [destination, setDestination] = useState("");
  const [shipmentValue, setShipmentValue] = useState("");

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  }, []);

  const fileToBase64 = (f: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(f);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });

  const handleExtract = async () => {
    if (!file) return;
    setExtracting(true);
    try {
      const base64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("extract-shipment", {
        body: { file_base64: base64, file_name: file.name, file_type: file.type },
      });
      if (error) throw error;
      if (data.hs_code) setHsCode(data.hs_code);
      if (data.product_name) setProductName(data.product_name);
      if (data.destination_country) setDestination(data.destination_country);
      if (data.shipment_value) setShipmentValue(String(data.shipment_value));
      setMode("manual");
      toast({ title: "Document read", description: "Review the extracted fields below and simulate." });
    } catch (err) {
      console.error(err);
      toast({ title: "Extraction failed", description: "Could not read the document. Fill in the fields manually.", variant: "destructive" });
      setMode("manual");
    } finally {
      setExtracting(false);
    }
  };

  const handleSimulate = async () => {
    if (!hsCode || !destination || !shipmentValue) {
      toast({ title: "Missing fields", description: "Fill in HS code, destination, and shipment value.", variant: "destructive" });
      return;
    }
    const value = parseFloat(shipmentValue.replace(/[^0-9.]/g, ""));
    if (isNaN(value) || value <= 0) {
      toast({ title: "Invalid value", description: "Enter a valid shipment value in USD.", variant: "destructive" });
      return;
    }

    setSimulating(true);
    try {
      const { data, error } = await supabase.functions.invoke("simulate-tariff", {
        body: { hs_code: hsCode, destination_country: destination, shipment_value: value, product_name: productName },
      });
      if (error) throw error;
      navigate("/results", { state: { result: data, input: { hsCode, productName, destination, shipmentValue: value } } });
    } catch (err) {
      console.error(err);
      toast({ title: "Simulation failed", description: "Could not generate simulation. Please try again.", variant: "destructive" });
    } finally {
      setSimulating(false);
    }
  };

  const selectedProduct = PRODUCTS.find(p => p.hs_code === hsCode);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar />
      <main className="container mx-auto px-5 sm:px-6 py-12 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-2">Simulate a shipment</h1>
          <p className="text-muted-foreground">Upload a trade document or enter details manually. We'll show the tariff impact and what to do.</p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode("document")}
            className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${mode === "document" ? "border-primary bg-primary-soft text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            Upload document
          </button>
          <button
            onClick={() => setMode("manual")}
            className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${mode === "manual" ? "border-primary bg-primary-soft text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            Enter manually
          </button>
        </div>

        {/* Document upload */}
        {mode === "document" && (
          <div className="mb-6">
            <div
              onDrop={handleFileDrop}
              onDragOver={(e) => e.preventDefault()}
              className="rounded-xl border-2 border-dashed border-border hover:border-primary/40 transition-colors bg-muted/20 p-8 text-center cursor-pointer"
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <input id="file-input" type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileInput} />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div className="text-left">
                    <div className="font-medium text-foreground text-sm">{file.name}</div>
                    <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="ml-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-1">Drop your invoice, packing list, or trade document here</p>
                  <p className="text-xs text-muted-foreground">PDF, JPG, PNG supported</p>
                </>
              )}
            </div>

            {file && (
              <Button onClick={handleExtract} disabled={extracting} className="w-full mt-3 bg-primary hover:bg-primary/90 text-primary-foreground">
                {extracting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Reading document…</> : <><FileText className="h-4 w-4 mr-2" /> Extract shipment details</>}
              </Button>
            )}

            <div className="mt-4 text-center">
              <button onClick={() => setMode("manual")} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
                Skip — enter details manually
              </button>
            </div>
          </div>
        )}

        {/* Manual / post-extraction form */}
        {mode === "manual" && (
          <div className="space-y-5 mb-6">
            <div>
              <Label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" /> Product
              </Label>
              <Select value={hsCode} onValueChange={(v) => { setHsCode(v); setProductName(PRODUCTS.find(p => p.hs_code === v)?.name ?? ""); }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a product…" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCTS.map((p) => (
                    <SelectItem key={p.hs_code} value={p.hs_code}>
                      {p.name} <span className="text-muted-foreground ml-1">(HS {p.hs_code})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!selectedProduct && (
                <div className="mt-2 flex gap-2">
                  <Input
                    placeholder="Or enter HS code (e.g. 1201)"
                    value={hsCode}
                    onChange={(e) => setHsCode(e.target.value)}
                    className="font-mono"
                  />
                  <Input
                    placeholder="Product name"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" /> Destination country
              </Label>
              <Select value={destination} onValueChange={setDestination}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select destination…" />
                </SelectTrigger>
                <SelectContent>
                  {DESTINATION_COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" /> Shipment value (USD)
              </Label>
              <Input
                placeholder="e.g. 500000"
                value={shipmentValue}
                onChange={(e) => setShipmentValue(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>
        )}

        {mode === "manual" && (
          <Button
            onClick={handleSimulate}
            disabled={simulating || !hsCode || !destination || !shipmentValue}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11 font-medium"
          >
            {simulating
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Simulating…</>
              : <>Simulate tariff impact <ArrowRight className="ml-2 h-4 w-4" /></>}
          </Button>
        )}
      </main>
      <Footer />
    </div>
  );
}
