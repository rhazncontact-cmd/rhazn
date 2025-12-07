// app/components/AgentGuard.tsx

import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useUser } from "../../context/UserContext";
import { supabase } from "../../lib/supabase";

const GOLD = "#D4AF37";
const MAX_ATTEMPTS = 3;
const OTP_DURATION_MS = 60 * 1000; // 60s

type GuardStatus = "loading" | "code" | "otp" | "allowed" | "denied" | "blocked";

export default function AgentGuard({ children }) {
  const router = useRouter();
  const { user } = useUser();

  const [status, setStatus] = useState<GuardStatus>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [serverCode, setServerCode] = useState<string | null>(null);

  const [secretInput, setSecretInput] = useState("");
  const [otpInput, setOtpInput] = useState("");

  const [attempts, setAttempts] = useState(0);
  const [verifying, setVerifying] = useState(false);

  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);

  // 1️⃣ Vérifier dans Supabase si c'est un Agent + récupérer secret_code
  useEffect(() => {
    const verifyAgent = async () => {
      if (!user || !user.id) {
        router.replace("/auth/login");
        return;
      }

      const { data, error } = await supabase
        .from("agents")
        .select("uid, secret_code")
        .eq("uid", user.id)
        .maybeSingle();

      if (error || !data) {
        setStatus("denied");
        return;
      }

      setServerCode(data.secret_code || null);
      setStatus("code");
    };

    verifyAgent();
  }, [user]);

  // Générer un OTP 6 chiffres
  const generateOtp = () => {
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += Math.floor(Math.random() * 10).toString();
    }
    return code;
  };

  // 2️⃣ Validation du code secret
  const handleSecretValidation = async () => {
    if (!secretInput.trim()) {
      setErrorMsg("Veuillez entrer le code secret.");
      return;
    }
    if (!serverCode) {
      setErrorMsg("Aucun code secret défini pour cet Agent.");
      return;
    }

    setVerifying(true);
    setErrorMsg(null);

    setTimeout(async () => {
      if (secretInput.trim() === serverCode) {
        // Secret correct → générer OTP
        const otp = generateOtp();
        const expiresAt = Date.now() + OTP_DURATION_MS;

        setGeneratedOtp(otp);
        setOtpExpiresAt(expiresAt);

        // On journalise dans la table agents_otp (log + futur email)
        if (user?.id) {
          await supabase.from("agents_otp").insert({
            agent_uid: user.id,
            otp_code: otp,
            expires_at: new Date(expiresAt).toISOString(),
          });
        }

        setStatus("otp");
      } else {
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);

        if (nextAttempts >= MAX_ATTEMPTS) {
          setStatus("blocked");
        } else {
          setErrorMsg(`Code secret incorrect. Tentative ${nextAttempts}/${MAX_ATTEMPTS}.`);
        }
      }

      setVerifying(false);
    }, 600);
  };

  // 3️⃣ Validation de l’OTP
  const handleOtpValidation = () => {
    if (!otpInput.trim()) {
      setErrorMsg("Veuillez entrer le code OTP.");
      return;
    }
    if (!generatedOtp || !otpExpiresAt) {
      setErrorMsg("OTP non initialisé. Recommencez.");
      return;
    }

    const now = Date.now();
    if (now > otpExpiresAt) {
      setErrorMsg("OTP expiré. Reconnectez-vous.");
      setStatus("blocked");
      return;
    }

    setVerifying(true);
    setErrorMsg(null);

    setTimeout(() => {
      if (otpInput.trim() === generatedOtp) {
        setStatus("allowed");
      } else {
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);

        if (nextAttempts >= MAX_ATTEMPTS) {
          setStatus("blocked");
        } else {
          setErrorMsg(`OTP incorrect. Tentative ${nextAttempts}/${MAX_ATTEMPTS}.`);
        }
      }
      setVerifying(false);
    }, 600);
  };

  // =========================
  // RENDER : LOADING
  // =========================
  if (status === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GOLD} />
        <Text style={styles.text}>Vérification sécurisée...</Text>
      </View>
    );
  }

  // =========================
  // RENDER : NON-AGENT
  // =========================
  if (status === "denied") {
    return (
      <View style={styles.center}>
        <Text style={[styles.title, { color: "#ff4444" }]}>Accès réservé — Identité Agent non trouvée.</Text>
        <Text style={styles.subtitle}>
          Votre profil n’est pas enregistré ou reconnu comme Agent RZ.{"\n"}
          Pour poursuivre, contactez immédiatement l’Administration RHAZN.
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // =========================
  // RENDER : BLOQUÉ
  // =========================
  if (status === "blocked") {
    return (
      <View style={styles.center}>
        <Text style={[styles.title, { color: "#ff4444" }]}>Accès bloqué</Text>
        <Text style={styles.subtitle}>
          Trop de tentatives incorrectes.{"\n"}
          Réessayez plus tard ou contactez le support RHAZN.
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // =========================
  // RENDER : ÉTAPE 1 – CODE SECRET
  // =========================
  if (status === "code") {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>🔐 Accès Agent RZ</Text>
        <Text style={styles.subtitle}>
          Entrez votre code secret Agent avant de recevoir l’OTP.
        </Text>

        <TextInput
          secureTextEntry
          placeholder="Code secret Agent"
          placeholderTextColor="#777"
          style={styles.input}
          value={secretInput}
          onChangeText={setSecretInput}
        />

        {errorMsg && <Text style={styles.error}>{errorMsg}</Text>}

        <TouchableOpacity
          style={styles.button}
          onPress={handleSecretValidation}
          disabled={verifying}
        >
          {verifying ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.buttonText}>Valider le code secret</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.hint}>
          {MAX_ATTEMPTS} tentatives maximum avant blocage.
        </Text>
      </View>
    );
  }

  // =========================
  // RENDER : ÉTAPE 2 – OTP
  // =========================
  if (status === "otp") {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>📲 Code OTP envoyé</Text>
        <Text style={styles.subtitle}>
          Un code OTP à 6 chiffres vient d'être généré.{"\n"}
          (En prod : envoyé par email / SMS.)
        </Text>

        {/* DEV ONLY : afficher l’OTP pour tester (à retirer en prod) */}
        {generatedOtp && (
          <Text style={[styles.subtitle, { color: GOLD, marginBottom: 8 }]}>
            OTP (dev) : {generatedOtp}
          </Text>
        )}

        <TextInput
          keyboardType="numeric"
          maxLength={6}
          placeholder="Entrez l'OTP"
          placeholderTextColor="#777"
          style={styles.input}
          value={otpInput}
          onChangeText={setOtpInput}
        />

        {errorMsg && <Text style={styles.error}>{errorMsg}</Text>}

        <TouchableOpacity
          style={styles.button}
          onPress={handleOtpValidation}
          disabled={verifying}
        >
          {verifying ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.buttonText}>Valider l'OTP</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.hint}>OTP valable 60 secondes.</Text>
      </View>
    );
  }

  // =========================
  // RENDER : AUTORISÉ
  // =========================
  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  title: {
    color: GOLD,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    color: "#aaa",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  input: {
    width: "100%",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GOLD,
    backgroundColor: "#111",
    color: "#fff",
    marginBottom: 10,
  },
  button: {
    backgroundColor: GOLD,
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: 10,
    marginTop: 6,
  },
  buttonText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 15,
  },
  error: {
    color: "#ff4444",
    fontSize: 13,
    marginBottom: 6,
    textAlign: "center",
  },
  hint: {
    color: "#777",
    fontSize: 12,
    marginTop: 10,
    textAlign: "center",
  },
  text: {
    color: GOLD,
    marginTop: 10,
    fontSize: 14,
  },
});
