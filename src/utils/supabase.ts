import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fdbxikqwzingtzcptfsh.supabase.co/rest/v1/';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkYnhpa3F3emluZ3R6Y3B0ZnNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4MDk1MzgsImV4cCI6MjEwMTM4NTUzOH0.9BwBhuVVI84IwIE_mKooQ22VgVtu6Js-e4p9BAM08LU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Supabase Storage 버킷('inspection-photos')으로 사진 파일(File 또는 Base64)을 업로드하고 Public URL을 반환
 */
export const uploadPhotoToStorage = async (file: File | string, itemId: string): Promise<string> => {
  try {
    let fileBlob: Blob;
    let fileExt = 'jpg';

    if (typeof file === 'string') {
      // Base64 문자열인 경우 Blob 변환
      const res = await fetch(file);
      fileBlob = await res.blob();
    } else {
      fileBlob = file;
      fileExt = file.name.split('.').pop() || 'jpg';
    }

    // 파일 고유 파일명 생성 (예: h_s_1_1722700000000_random.jpg)
    const fileName = `${itemId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const filePath = `photos/${fileName}`;

    // Storage 업로드
    const { data, error } = await supabase.storage
      .from('inspection-photos')
      .upload(filePath, fileBlob, {
        contentType: fileBlob.type || 'image/jpeg',
        upsert: true
      });

    if (error) {
      console.error('Storage upload error:', error);
      throw error;
    }

    // 업로드된 파일의 Public URL 받아오기
    const { data: publicUrlData } = supabase.storage
      .from('inspection-photos')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (err: any) {
    console.error('uploadPhotoToStorage Catch:', err);
    throw new Error(`사진 업로드 실패: ${err.message || '네트워크 오류'}`);
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
