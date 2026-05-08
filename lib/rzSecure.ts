import * as SecureStore from "expo-secure-store";

/*
SAFE SECURESTORE
corrige bug Expo Go :
getValueWithKeyAsync is not a function
*/

let memory: Record<string,string> = {};

export const rzSecure = {

  async get(key:string){
    try{
      if(SecureStore?.getItemAsync){
        const v = await SecureStore.getItemAsync(key);
        if(v!==null && v!==undefined) return v;
      }
    }catch(e){
      console.log("SecureStore read fail → memory fallback");
    }

    return memory[key] ?? null;
  },

  async set(key:string,value:string){
    memory[key]=value;

    try{
      if(SecureStore?.setItemAsync){
        await SecureStore.setItemAsync(key,value);
      }
    }catch(e){
      console.log("SecureStore write fail → memory fallback");
    }
  },

  async del(key:string){
    delete memory[key];

    try{
      if(SecureStore?.deleteItemAsync){
        await SecureStore.deleteItemAsync(key);
      }
    }catch{}
  }
};
