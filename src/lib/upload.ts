import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

import { supabase } from '@/lib/supabase';

const BUCKET = 'shop-assets';

/**
 * Escolhe uma foto da galeria, recorta, reduz e envia para o armazenamento da barbearia.
 * Devolve a URL pública, ou null se o barbeiro cancelou ou algo falhou (já avisado na tela).
 * O primeiro nível do caminho é o id da barbearia: é o que as regras de acesso exigem.
 */
export async function pickAndUploadImage(options: {
  shopId: string;
  /** Pasta/nome base, ex.: "logo" ou "services/corte". */
  name: string;
  aspect: [number, number];
  /** Largura final em pixels (a altura segue o recorte). */
  width: number;
}): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Permissão necessária', 'Permita o acesso às fotos para escolher a imagem.');
    return null;
  }

  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: options.aspect,
    quality: 1,
  });
  if (picked.canceled || !picked.assets[0]) return null;

  try {
    // Foto de celular tem vários MB; reduz para algo em torno de 100 a 300 KB antes de enviar.
    const image = await ImageManipulator.manipulate(picked.assets[0].uri).resize({ width: options.width }).renderAsync();
    const saved = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
    const body = await (await fetch(saved.uri)).arrayBuffer();

    // Nome novo a cada envio: evita imagem antiga em cache no site.
    const path = `${options.shopId}/${options.name}-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType: 'image/jpeg' });
    if (error) throw error;
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  } catch {
    Alert.alert('Não foi possível enviar a imagem', 'Verifique a internet e tente de novo.');
    return null;
  }
}
