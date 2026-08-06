import React, {useEffect, useState} from 'react';
import {useParams} from 'react-router-dom';
import {getPublicContract} from '../api';
import {formatContractCurrency, formatContractDate} from '../utils/contractFormat';

/**
 * Публичная (без авторизации) электронная версия договора - открывается по
 * QR-коду с печатной версии (см. EventDetailModal.jsx). Доступ по
 * непредсказуемому contract_token, а не по id, чтобы нельзя было перебором
 * подобрать чужой договор.
 */
const ContractPublicPage = () => {
    const {token} = useParams();
    const [contract, setContract] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setNotFound(false);

        getPublicContract(token)
            .then((res) => {
                if (!cancelled) setContract(res.data);
            })
            .catch(() => {
                if (!cancelled) setNotFound(true);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [token]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    if (notFound || !contract) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
                <div className="bg-white rounded-xl shadow p-8 text-center max-w-sm">
                    <p className="text-xl font-bold text-red-600 mb-2">Договор не найден</p>
                    <p className="text-gray-600 text-sm">
                        Ссылка недействительна или устарела. Уточните у RED VIDEO GROUP.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 py-8 px-4">
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6 sm:p-8 text-gray-900">
                {/* Шапка договора */}
                <div className="text-center border-b-2 border-red-600 pb-3 mb-4">
                    <img src="/redlogo.png" alt="Логотип" className="w-40 mx-auto mb-2"/>
                    <p className="text-lg font-bold text-red-600 leading-tight">
                        ДОГОВОР № {contract.id}
                    </p>
                    <p className="text-sm text-gray-600">от {formatContractDate(contract.created_at)}</p>
                </div>

                {/* Информация о клиенте */}
                <div className="mb-4 flex flex-wrap items-start justify-between gap-2 text-gray-800">
                    <div className="flex flex-col">
                        <p className="text-base"><strong>Клиент:</strong> {contract.client?.name}</p>
                        <p className="text-base">
                            <strong>Телефон:</strong> +{(contract.client?.phones || []).join(', +')}
                        </p>
                    </div>
                    <p className="text-sm text-gray-600">
                        <strong>Номер компьютера:</strong> {contract.computer_numbers || '_________'}
                    </p>
                </div>

                {/* Услуги */}
                <div className="mb-4">
                    <h2 className="text-lg font-bold text-red-600 uppercase tracking-wide mb-2">Список услуг</h2>
                    <div className="rounded-lg border border-gray-300 overflow-hidden overflow-x-auto">
                        <table className="w-full text-sm sm:text-base border-collapse bg-white">
                            <thead>
                                <tr className="bg-white text-black text-left border-b-2 border-red-600">
                                    <th className="py-2 px-3 font-bold">Услуга</th>
                                    <th className="py-2 px-3 font-bold">Дата услуги</th>
                                    <th className="py-2 px-3 font-bold">Ресторан</th>
                                    <th className="py-2 px-3 font-bold">Камер</th>
                                    <th className="py-2 px-3 font-bold">Комментарий</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(contract.devices || []).map((device, index) => (
                                    <tr key={index} className="bg-white border-b border-gray-300 last:border-b-0">
                                        <td className="py-2 px-3 font-bold text-red-600 whitespace-nowrap">
                                            {device.service_name || 'Услуга не найдена'}
                                        </td>
                                        <td className="py-2 px-3 text-gray-800 whitespace-nowrap">
                                            {device.event_service_date ? formatContractDate(device.event_service_date) : 'Дата не указана'}
                                        </td>
                                        <td className="py-2 px-3 text-gray-800">{device.restaurant_name || '—'}</td>
                                        <td className="py-2 px-3 text-gray-800">{device.camera_count || '—'}</td>
                                        <td className="py-2 px-3 text-gray-800">{device.comment || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Финансовая информация */}
                <div className="mb-4">
                    <h2 className="text-base font-bold text-red-600 uppercase tracking-wide mb-1">Финансовая информация</h2>
                    <div className="flex flex-wrap text-base text-gray-800 gap-4 border border-gray-300 rounded px-3 py-1.5 bg-white">
                        <p><strong>Общая сумма:</strong> {formatContractCurrency(contract.amount, contract.amount_money)}</p>
                        <p><strong>Аванс:</strong> {formatContractCurrency(contract.advance, contract.advance_money)}</p>
                        <p>
                            <strong>Остаток:</strong>{' '}
                            {formatContractCurrency(contract.amount - contract.advance, contract.amount_money)}
                        </p>
                    </div>
                </div>

                {/* Условия договора */}
                <div className="mb-2">
                    <h2 className="text-base font-bold text-red-600 uppercase tracking-wide mb-1">Условия договора</h2>
                    <p className="text-justify text-sm text-gray-800 leading-tight mb-1">
                        Просим вас внимательно ознакомиться с условиями оказания услуг. Благодарим вас за доверие и
                        выбор нашей команды!
                    </p>
                    <ol className="list-decimal list-outside pl-4 space-y-0.5 text-sm text-gray-800 leading-tight">
                        <li>
                            <strong>Оплата услуг</strong> производится в размере <strong>100% стоимости заказа</strong>{' '}
                            не позднее дня проведения мероприятия.
                        </li>
                        <li>
                            <strong>Передача готового материала</strong> осуществляется на флеш-накопитель или внешний
                            жёсткий диск, предоставленный Заказчиком. Исполнитель не предоставляет носители информации.
                        </li>
                        <li>
                            <strong>Отмена заказа и возврат предоплаты:</strong>
                            <ul className="list-disc list-outside pl-4 space-y-0.5 mt-0.5">
                                <li>
                                    при отмене заказа в течение <strong>3 (трёх) календарных дней</strong> с момента
                                    заключения договора предоплата возвращается Заказчику в полном объёме (
                                    <strong>100%</strong>);
                                </li>
                                <li>
                                    при отмене заказа <strong>по истечении 3 (трёх) календарных дней</strong> предоплата
                                    возвращается в размере <strong>50%</strong> от внесённой суммы.
                                </li>
                            </ul>
                        </li>
                    </ol>
                    <p className="text-justify text-sm text-gray-800 leading-tight mt-1">
                        Благодарим вас за выбор наших услуг и надеемся, что наше сотрудничество оставит только
                        приятные впечатления!
                    </p>
                </div>

                <p className="text-center text-xs text-gray-400 mt-6">
                    Электронная версия договора · RED VIDEO GROUP
                </p>
            </div>
        </div>
    );
};

export default ContractPublicPage;
