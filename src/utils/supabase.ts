import { createClient } from '@supabase/supabase-js';

// 기본 입력값
const rawUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fdbxikqwzingtzcptfsh.supabase.co/rest/v1/';
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkYnhpa3F3emluZ3R6Y3B0ZnNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4MDk1MzgsImV4cCI6MjEwMTM4NTUzOH0.9BwBhuVVI84IwIE_mKooQ22VgVtu6Js-e4p9BAM08LU';

// 💡 URL 끝의 /rest/v1/ 이나 / 슬래시를 완벽히 제거하여 순수 도메인만 정제 (https://fdbxikqwzingtzcptfsh.supabase.co)
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey = rawAnonKey.trim();

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Supabase Storage 버킷('inspection-photos')으로 사진 파일(File 또는 Base64)을 업로드하고 Public URL을 반환
 */
export const uploadPhotoToStorage = async (file: File | string, itemId: string): Promise<string> => {
  try {
    let fileBlob: Blob;
    let fileExt = 'jpg';

    if (typeof file === 'string') {
      const res = await fetch(file);
      fileBlob = await res.blob();
    } else {
      fileBlob = file;
      fileExt = file.name.split('.').pop() || 'jpg';
    }

    // 파일명 인코딩 에러 방지를 위한 정제
    const cleanItemId = String(itemId).replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${cleanItemId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

    // Storage 업로드 (inspection-photos 버킷 루트에 바로 저장)
    const { data, error } = await supabase.storage
      .from('inspection-photos')
      .upload(fileName, fileBlob, {
        contentType: fileBlob.type || 'image/jpeg',
        upsert: true
      });

    if (error) {
      console.error('Storage upload error details:', error);
      throw error;
    }

    // Public URL 추출
    const { data: publicUrlData } = supabase.storage
      .from('inspection-photos')
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  } catch (err: any) {
    console.error('uploadPhotoToStorage Catch:', err);
    throw new Error(err.message || '네트워크 통신 오류');
  }
};

/**
 * Storage 버킷에서 특정 URL의 사진 파일들을 삭제
 */
export const deletePhotosFromStorage = async (photoUrls: string[]) => {
  if (!photoUrls || photoUrls.length === 0) return;

  try {
    const filePaths = photoUrls
      .map(url => {
        const parts = url.split('/inspection-photos/');
        return parts.length > 1 ? parts[1] : null;
      })
      .filter((path): path is string => path !== null);

    if (filePaths.length > 0) {
      await supabase.storage.from('inspection-photos').remove(filePaths);
    }
  } catch (err) {
    console.error('deletePhotosFromStorage Error:', err);
  }
};
