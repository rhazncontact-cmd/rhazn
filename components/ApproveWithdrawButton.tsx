import { supabase } from '@/lib/supabase'
import { Alert, Pressable, Text } from 'react-native'

type Props = {
  requestId: string
}

export function ApproveWithdrawButton({ requestId }: Props) {
  const approve = async () => {
    const { error } = await supabase.rpc(
      'agent_approve_withdraw_request',
      {
        p_request_id: requestId
      }
    )

    if (error) {
      Alert.alert('Erreur', error.message)
      return
    }

    Alert.alert('Succès', 'Demande approuvée')
  }

  return (
    <Pressable
      onPress={approve}
      style={{
        backgroundColor: '#16a34a',
        padding: 14,
        borderRadius: 10
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '600' }}>
        Approuver
      </Text>
    </Pressable>
  )
}
