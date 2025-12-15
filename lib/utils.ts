import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalize Vietnamese string by removing diacritics and converting to lowercase
 * Example: "Toán học" -> "toan hoc", "Nguyễn" -> "nguyen"
 */
export function normalizeVietnamese(str: string): string {
  if (!str) return "";

  // Map Vietnamese characters to their non-diacritic equivalents
  const vietnameseMap: { [key: string]: string } = {
    'à': 'a', 'á': 'a', 'ạ': 'a', 'ả': 'a', 'ã': 'a',
    'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ậ': 'a', 'ẩ': 'a', 'ẫ': 'a',
    'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ặ': 'a', 'ẳ': 'a', 'ẵ': 'a',
    'è': 'e', 'é': 'e', 'ẹ': 'e', 'ẻ': 'e', 'ẽ': 'e',
    'ê': 'e', 'ề': 'e', 'ế': 'e', 'ệ': 'e', 'ể': 'e', 'ễ': 'e',
    'ì': 'i', 'í': 'i', 'ị': 'i', 'ỉ': 'i', 'ĩ': 'i',
    'ò': 'o', 'ó': 'o', 'ọ': 'o', 'ỏ': 'o', 'õ': 'o',
    'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ộ': 'o', 'ổ': 'o', 'ỗ': 'o',
    'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ợ': 'o', 'ở': 'o', 'ỡ': 'o',
    'ù': 'u', 'ú': 'u', 'ụ': 'u', 'ủ': 'u', 'ũ': 'u',
    'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ự': 'u', 'ử': 'u', 'ữ': 'u',
    'ỳ': 'y', 'ý': 'y', 'ỵ': 'y', 'ỷ': 'y', 'ỹ': 'y',
    'đ': 'd',
    'À': 'A', 'Á': 'A', 'Ạ': 'A', 'Ả': 'A', 'Ã': 'A',
    'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ậ': 'A', 'Ẩ': 'A', 'Ẫ': 'A',
    'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ặ': 'A', 'Ẳ': 'A', 'Ẵ': 'A',
    'È': 'E', 'É': 'E', 'Ẹ': 'E', 'Ẻ': 'E', 'Ẽ': 'E',
    'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ệ': 'E', 'Ể': 'E', 'Ễ': 'E',
    'Ì': 'I', 'Í': 'I', 'Ị': 'I', 'Ỉ': 'I', 'Ĩ': 'I',
    'Ò': 'O', 'Ó': 'O', 'Ọ': 'O', 'Ỏ': 'O', 'Õ': 'O',
    'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ộ': 'O', 'Ổ': 'O', 'Ỗ': 'O',
    'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ợ': 'O', 'Ở': 'O', 'Ỡ': 'O',
    'Ù': 'U', 'Ú': 'U', 'Ụ': 'U', 'Ủ': 'U', 'Ũ': 'U',
    'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ự': 'U', 'Ử': 'U', 'Ữ': 'U',
    'Ỳ': 'Y', 'Ý': 'Y', 'Ỵ': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y',
    'Đ': 'D',
  };

  return str
    .split('')
    .map(char => vietnameseMap[char] || char)
    .join('')
    .toLowerCase();
}

/**
 * Check if search term matches text (case-insensitive and diacritic-insensitive)
 * Example: matches("toan", "Toán học") -> true
 * If searchTerm is empty, returns true (show all items)
 */
export function matchesSearch(searchTerm: string, text: string): boolean {
  // If no text, don't match
  if (!text) return false;

  // If no search term (empty string), show all items
  if (!searchTerm || searchTerm.trim() === "") return true;

  const normalizedSearch = normalizeVietnamese(searchTerm.trim());
  const normalizedText = normalizeVietnamese(text);

  return normalizedText.includes(normalizedSearch);
}

/**
 * Validate name (first name or last name)
 * Rules:
 * - Not empty
 * - Only letters (Vietnamese characters allowed)
 * - No numbers
 * - No special characters (except spaces and Vietnamese diacritics)
 * - No HTML tags
 */
export function validateName(name: string): { valid: boolean; error?: string } {
  // Check if empty
  if (!name || name.trim() === "") {
    return { valid: false, error: "Tên không được để trống" };
  }

  const trimmedName = name.trim();

  // Check for HTML tags
  if (/<[^>]*>/g.test(trimmedName)) {
    return { valid: false, error: "Tên không được chứa thẻ HTML" };
  }

  // Check for numbers
  if (/\d/.test(trimmedName)) {
    return { valid: false, error: "Tên không được chứa số" };
  }

  // Check for special characters (allow only letters, spaces, and Vietnamese diacritics)
  // Vietnamese letters: a-z, A-Z, and Vietnamese diacritics
  // Full Vietnamese Y characters: ý, ỳ, ỷ, ỹ, ỵ (lowercase) and Ý, Ỳ, Ỷ, Ỹ, Ỵ (uppercase)
  const vietnameseNamePattern = /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴỶỸửữựỳýỵỷỹÝ\s]+$/;

  if (!vietnameseNamePattern.test(trimmedName)) {
    return { valid: false, error: "Tên chỉ được chứa chữ cái" };
  }

  // Check minimum length
  if (trimmedName.length < 2) {
    return { valid: false, error: "Tên phải có ít nhất 2 ký tự" };
  }

  // Check maximum length
  if (trimmedName.length > 50) {
    return { valid: false, error: "Tên không được quá 50 ký tự" };
  }

  return { valid: true };
}