import AsyncStorage from "@react-native-async-storage/async-storage";

const USERS_KEY = "RHAZN_USERS";

export async function registerLocalUser(email, password, idImage) {
  try {
    const usersJson = await AsyncStorage.getItem(USERS_KEY);
    let users = usersJson ? JSON.parse(usersJson) : [];

    // Vérifier si email existe déjà
    if (users.find(u => u.email === email)) {
      throw new Error("EMAIL_EXISTS");
    }

    // Stocker utilisateur local
    const newUser = {
      email,
      password,
      idImage,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);

    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));

    return newUser;
  } catch (error) {
    throw error;
  }
}

export async function listLocalUsers() {
  const json = await AsyncStorage.getItem(USERS_KEY);
  return json ? JSON.parse(json) : [];
}
