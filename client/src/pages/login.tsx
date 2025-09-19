import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Delete, LogIn } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const handleNumberClick = (digit: string) => {
    if (pin.length < 4) {
      setPin(pin + digit);
      setError("");
    }
  };

  const handleClear = () => {
    setPin("");
    setError("");
  };

  const handleEnter = () => {
    if (pin.length !== 4) {
      setError("El PIN debe tener 4 dígitos");
      return;
    }

    switch (pin) {
      case "1111":
        // Mesero ID 1 - Juan
        login(1, "mesero");
        setLocation("/tables");
        break;
      case "2222":
        // Mesero ID 2 - María
        login(2, "mesero");
        setLocation("/tables");
        break;
      case "3333":
        // Mesero ID 3 - Carlos
        login(3, "mesero");
        setLocation("/tables");
        break;
      case "5555":
        // Cajero
        login(555, "cajero");
        setLocation("/table-map");
        break;
      case "9999":
        // Admin
        login(999, "admin");
        setLocation("/admin");
        break;
      default:
        setError("PIN incorrecto");
        setPin("");
        break;
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    const key = event.key;
    if (key >= "0" && key <= "9") {
      handleNumberClick(key);
    } else if (key === "Backspace") {
      handleClear();
    } else if (key === "Enter") {
      handleEnter();
    }
  };

  const renderPinDisplay = () => {
    return (
      <div className="flex justify-center gap-2 mb-8">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="w-12 h-12 rounded-lg border-2 border-border bg-background flex items-center justify-center text-xl font-bold"
          >
            {pin[index] ? "●" : ""}
          </div>
        ))}
      </div>
    );
  };

  const renderKeypad = () => {
    const numbers = [
      ["1", "2", "3"],
      ["4", "5", "6"],
      ["7", "8", "9"],
      ["", "0", ""]
    ];

    return (
      <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
        {numbers.flat().map((num, index) => {
          if (num === "") {
            return <div key={`keypad-empty-${index}`} className="h-16"></div>;
          }
          return (
            <Button
              key={`keypad-${num}-${index}`}
              variant="outline"
              size="lg"
              className="h-16 text-2xl font-bold hover-elevate active-elevate-2"
              onClick={() => handleNumberClick(num)}
              data-testid={`button-pin-${num}`}
            >
              {num}
            </Button>
          );
        })}
      </div>
    );
  };

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4"
      onKeyDown={handleKeyPress}
      tabIndex={0}
      data-testid="login-screen"
    >
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-3xl font-bold text-primary mb-2">
            Sistema POS
          </CardTitle>
          <p className="text-muted-foreground">
            Introduce tu PIN de acceso
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* PIN Display */}
          {renderPinDisplay()}

          {/* Error Message */}
          {error && (
            <div className="text-center">
              <Badge variant="destructive" className="text-sm" data-testid="error-message">
                {error}
              </Badge>
            </div>
          )}

          {/* Keypad */}
          {renderKeypad()}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-8">
            <Button
              variant="outline"
              size="lg"
              className="flex-1 h-12 hover-elevate active-elevate-2"
              onClick={handleClear}
              data-testid="button-clear"
            >
              <Delete className="w-4 h-4 mr-2" />
              Borrar
            </Button>
            <Button
              size="lg"
              className="flex-1 h-12 hover-elevate active-elevate-2"
              onClick={handleEnter}
              disabled={pin.length !== 4}
              data-testid="button-enter"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Entrar
            </Button>
          </div>

          {/* Helper Text */}
          <div className="text-center text-sm text-muted-foreground pt-4">
            <p>Usa el teclado físico o toca los números</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}