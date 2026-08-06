import {format, isValid, parseISO} from 'date-fns';
import {ru} from 'date-fns/locale';

/**
 * Общее форматирование для печатной (EventDetailModal) и публичной
 * (ContractPublicPage, открывается по QR) версий договора - чтобы они
 * выглядели одинаково.
 */

export const formatContractCurrency = (number, isUSD) =>
    new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: isUSD ? 'USD' : 'UZS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(number);

export const formatContractDate = (dateString) => {
    if (!dateString) return 'Дата не указана';
    const date = parseISO(dateString);
    if (!isValid(date)) return 'Дата не указана';
    return format(date, 'dd MMMM yyyy', {locale: ru});
};
