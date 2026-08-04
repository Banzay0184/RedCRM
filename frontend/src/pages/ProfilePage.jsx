import { FaUser, FaEnvelope, FaIdBadge, FaShieldAlt } from 'react-icons/fa';
import { isAdmin } from '../utils/roles.js';

function ProfilePage({ user }) {
    const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ');

    return (
        <div className="container mx-auto p-4 max-w-2xl">
            <h1 className="text-2xl font-bold mb-6">Мой профиль</h1>

            <div className="bg-base-200 rounded-lg p-6 shadow-lg">
                <div className="flex items-center gap-4 mb-6">
                    <div className="bg-base-300 rounded-full p-4">
                        <FaUser className="text-3xl text-primary" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">{user?.username || 'Без имени'}</h2>
                        <span className={`badge ${isAdmin(user) ? 'badge-primary' : 'badge-ghost'} gap-1 mt-1`}>
                            <FaShieldAlt className="text-xs" />
                            {isAdmin(user) ? 'Администратор' : 'Сотрудник'}
                        </span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <FaIdBadge className="text-primary" />
                        <span className="font-semibold">ФИО:</span>
                        <span>{fullName || 'Не указано'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <FaEnvelope className="text-primary" />
                        <span className="font-semibold">Email:</span>
                        <span>{user?.email || 'Не указан'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProfilePage;
