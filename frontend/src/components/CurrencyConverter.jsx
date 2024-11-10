import React, {useEffect, useState} from 'react';
import axios from 'axios';

function CurrencyConverter(amount, setAmount) {
    // const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('Dollar');
    const [convertedAmount, setConvertedAmount] = useState('');
    const [exchangeRate, setExchangeRate] = useState(null);

    // Получаем курс обмена при монтировании компонента
    useEffect(() => {
        async function fetchExchangeRate() {
            const response = await axios.get('https://v6.exchangerate-api.com/v6/c97c87ea87177917023baf77/latest/USD');
            // const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD'); // Замените на ваш API
            setExchangeRate(response.data.rates.UZS);
        }

        fetchExchangeRate();
    }, []);

    // Обработчик изменения суммы
    const handleAmountChange = (e) => {
        const value = e.target.value;
        setAmount(value);

        if (currency === 'Dollar' && exchangeRate) {
            setConvertedAmount((value * exchangeRate).toFixed(2));
        } else {
            setConvertedAmount(value);
        }
    };

    // Обработчик изменения валюты
    const handleCurrencyChange = (e) => {
        const selectedCurrency = e.target.value;
        setCurrency(selectedCurrency);

        if (selectedCurrency === 'Dollar' && exchangeRate) {
            setConvertedAmount((amount * exchangeRate).toFixed(2));
        } else {
            setConvertedAmount(amount);
        }
    };

    return (
        <div>
            <select value={currency} onChange={handleCurrencyChange}>

            </select>


            <input
                type="number"
                value={amount}
                onChange={handleAmountChange}
                placeholder="Введите сумму"
            />
            <div>
                <strong>Конвертированная сумма: </strong>
                {convertedAmount} {currency === 'Dollar' ? 'UZS' : 'UZS'}
            </div>
        </div>
    );
}

export default CurrencyConverter;
