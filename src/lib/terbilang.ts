const SATUAN = [
  '',
  'Satu',
  'Dua',
  'Tiga',
  'Empat',
  'Lima',
  'Enam',
  'Tujuh',
  'Delapan',
  'Sembilan',
  'Sepuluh',
  'Sebelas',
];

function konversiTerbilang(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n < 12) {
    return SATUAN[n];
  } else if (n < 20) {
    return konversiTerbilang(n - 10) + ' Belas';
  } else if (n < 100) {
    return (
      konversiTerbilang(Math.floor(n / 10)) +
      ' Puluh' +
      (n % 10 !== 0 ? ' ' + konversiTerbilang(n % 10) : '')
    );
  } else if (n < 200) {
    return 'Seratus' + (n - 100 !== 0 ? ' ' + konversiTerbilang(n - 100) : '');
  } else if (n < 1000) {
    return (
      konversiTerbilang(Math.floor(n / 100)) +
      ' Ratus' +
      (n % 100 !== 0 ? ' ' + konversiTerbilang(n % 100) : '')
    );
  } else if (n < 2000) {
    return 'Seribu' + (n - 1000 !== 0 ? ' ' + konversiTerbilang(n - 1000) : '');
  } else if (n < 1000000) {
    return (
      konversiTerbilang(Math.floor(n / 1000)) +
      ' Ribu' +
      (n % 1000 !== 0 ? ' ' + konversiTerbilang(n % 1000) : '')
    );
  } else if (n < 1000000000) {
    return (
      konversiTerbilang(Math.floor(n / 1000000)) +
      ' Juta' +
      (n % 1000000 !== 0 ? ' ' + konversiTerbilang(n % 1000000) : '')
    );
  } else if (n < 1000000000000) {
    return (
      konversiTerbilang(Math.floor(n / 1000000000)) +
      ' Miliar' +
      (n % 1000000000 !== 0 ? ' ' + konversiTerbilang(n % 1000000000) : '')
    );
  }
  return n.toString();
}

export function terbilangRupiah(nominal: number): string {
  if (!nominal || nominal === 0) return 'Nol Rupiah';
  return `${konversiTerbilang(nominal).trim()} Rupiah`;
}

export function formatRupiah(nominal: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(nominal || 0);
}
