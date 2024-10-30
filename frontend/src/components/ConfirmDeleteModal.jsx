function ConfirmDeleteModal({ onConfirm, onCancel }) {
    return (
        <div className="modal modal-open">
            <div className="modal-box">
                <h3 className="font-bold text-lg">Подтвердите удаление</h3>
                <p>Вы уверены, что хотите удалить этого клиента?</p>
                <div className="modal-action">
                    <button className="btn" onClick={onCancel}>
                        Отмена
                    </button>
                    <button className="btn btn-error text-white" onClick={onConfirm}>
                        Удалить
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ConfirmDeleteModal;
