import * as SecureStore from "expo-secure-store";

const KEY = "RZ_SESSION_TOKEN";

export async function rzSetToken(token: string) {
  await SecureStore.setItemAsync(KEY, token);
}

export async function rzGetToken() {
  return SecureStore.getItemAsync(KEY);
}

export async function rzClearToken() {
  await SecureStore.deleteItemAsync(KEY);
}
