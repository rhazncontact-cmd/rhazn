import { createContext, ReactNode, useContext, useState } from "react";

interface Transaction {
  type: string;
  amount: number;
  date: string;
}

interface WalletContextType {
  balance: number;        // ACSET
  tanBalance: number;     // TAN
  transactions: Transaction[];
  addTransaction: (tx: Transaction) => void;
  sendTAN: (amount: number) => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [balance, setBalance] = useState(3); // ACSET
  const [tanBalance, setTanBalance] = useState(200); // TAN user par défaut
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const addTransaction = (tx: Transaction) => {
    setTransactions((prev) => [...prev, tx]);
  };

  const sendTAN = (amount: number) => {
    if (tanBalance < amount) {
      alert("❌ Solde TAN insuffisant");
      return;
    }

    setTanBalance((prev) => prev - amount);

    addTransaction({
      type: `Envoi TAN`,
      amount: -amount,
      date: new Date().toISOString(),
    });

    alert("✅ TAN envoyés avec succès !");
  };

  return (
    <WalletContext.Provider
      value={{ balance, tanBalance, transactions, addTransaction, sendTAN }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used inside WalletProvider");
  return context;
};
