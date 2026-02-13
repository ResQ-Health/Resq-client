import React from 'react';
import PendingAppointments from '../../components/provider/PendingAppointments';

const PendingAppointmentsPage: React.FC = () => {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-[#16202E]">Pending Appointments</h2>
                <p className="text-gray-500 mt-1">Manage all your incoming appointment requests.</p>
            </div>
            <PendingAppointments />
        </div>
    );
};

export default PendingAppointmentsPage;
