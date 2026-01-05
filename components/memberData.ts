
export interface AvatarTransform {
    scale: number;      // Zoom level (1 = 100%)
    positionX: number;  // Horizontal position (-100 to 100)
    positionY: number;  // Vertical position (-100 to 100)
}

export type AgeGroup = 'Children/Sunday School' | 'Junior Youth' | 'Youth' | 'Adult';

export interface Member {
    id: string;
    name: string;
    title: string;
    avatar: string;
    avatarTransform?: AvatarTransform;  // Position and scale for avatar
    phone?: string;
    email?: string;
    department: string;
    role: string;
    status: 'Active' | 'Inactive' | 'Transferred';
    dateAdded: string;
    dob: string;
    gender: 'Male' | 'Female';
    occupation?: string;
    maritalStatus?: string;
    location?: string;
    ageGroup?: AgeGroup;  // Auto-calculated based on DOB
}

const formatMemberId = (id: number): string => `HKM-${String(id).padStart(3, '0')}`;

export const calculateAgeGroup = (dob: string): AgeGroup => {
    const birthDate = new Date(dob);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();

    // Adjust age if birthday hasn't occurred this year
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age - 1;
    }

    if (age <= 12) return 'Children/Sunday School';
    if (age <= 18) return 'Junior Youth';
    if (age <= 25) return 'Youth';
    return 'Adult';
};

export const initialMembers: Member[] = [
    {
        id: formatMemberId(1),
        name: 'greater grace',
        title: 'it officer',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=80&q=80',
        phone: '0246670114',
        email: 'Kaboreaziz723@gmail.com',
        department: 'Media',
        role: 'Member',
        status: 'Active',
        dateAdded: '2023-01-10',
        dob: '1990-05-15',
        gender: 'Male',
        ageGroup: calculateAgeGroup('1990-05-15'),
    },
    {
        id: formatMemberId(2),
        name: 'Afua Tawiah',
        title: '',
        avatar: 'https://images.unsplash.com/photo-14947901083 ৭৭-be9c29b29330?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=80&q=80',
        phone: '0271260433',
        email: 'afua.t@example.com',
        department: 'Choir',
        role: 'Member',
        status: 'Transferred',
        dateAdded: '2023-02-15',
        dob: '1988-11-22',
        gender: 'Female',
        ageGroup: calculateAgeGroup('1988-11-22'),
    },
    {
        id: formatMemberId(3),
        name: 'John Doe',
        title: 'Lead Usher',
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=80&q=80',
        phone: '0551234567',
        email: 'john.d@example.com',
        department: 'Ushering',
        role: 'Leader',
        status: 'Active',
        dateAdded: '2022-11-20',
        dob: '1985-08-01',
        gender: 'Male',
        ageGroup: calculateAgeGroup('1985-08-01'),
    },
    {
        id: formatMemberId(4),
        name: 'Jane Smith',
        title: 'Singer',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=80&q=80',
        phone: '0207654321',
        email: 'jane.s@example.com',
        department: 'Choir',
        role: 'Member',
        status: 'Active',
        dateAdded: '2023-05-01',
        dob: '1992-04-12',
        gender: 'Female',
        ageGroup: calculateAgeGroup('1992-04-12'),
    },
    {
        id: formatMemberId(5),
        name: 'Samuel Adu',
        title: 'Lead Deacon',
        avatar: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=80&q=80',
        phone: '0244112233',
        email: 'samuel.a@example.com',
        department: 'Deacon',
        role: 'Leader',
        status: 'Inactive',
        dateAdded: '2022-09-18',
        dob: '1978-07-30',
        gender: 'Male',
        ageGroup: calculateAgeGroup('1978-07-30'),
    },
    ...Array.from({ length: 70 }, (_, i): Member => {
        const firstNames = ['Kwame', 'Kofi', 'Yaw', 'David', 'Michael', 'Emmanuel', 'Ama', 'Adwoa', 'Grace', 'Mary', 'Esther'];
        const lastNames = ['Mensah', 'Owusu', 'Osei', 'Amoah', 'Agyemang', 'Boateng', 'Adjei', 'Asare', 'Gyan', 'Yeboah'];
        const departments = ["Choir", "Media", "Ushering", "Protocol", "Welfare", "Intercessors", "Junior Youth", "Youth", "Traffic", "Administration", "Instrumentalist", "Deacon", "Sunday School", "Pastoral Care", "Evangelism", "Technical"];
        const statuses: Member['status'][] = ["Active", "Inactive", "Transferred"];
        const roles = ["Member", "Leader"];
        const genders: Member['gender'][] = ['Male', 'Female'];

        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const today = new Date();
        const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));
        const randomDate = new Date(thirtyDaysAgo.getTime() + Math.random() * (today.getTime() - thirtyDaysAgo.getTime()));

        const start = new Date(1960, 0, 1);
        const end = new Date(2005, 11, 31);
        const randomDob = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

        const calculatedAgeGroup = calculateAgeGroup(randomDob.toISOString().split('T')[0]);

        return {
            id: formatMemberId(i + 6),
            name: `${firstName} ${lastName}`.toLowerCase(),
            title: '',
            avatar: `https://source.unsplash.com/80x80/?portrait&sig=${i + 5}`,
            phone: `0${[2, 5][Math.floor(Math.random() * 2)]}${Math.floor(10000000 + Math.random() * 90000000)}`.substring(0, 10),
            email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
            department: departments[Math.floor(Math.random() * departments.length)],
            role: Math.random() > 0.9 ? roles[1] : roles[0],
            status: Math.random() > 0.8 ? statuses[Math.floor(Math.random() * 2) + 1] : statuses[0],
            dateAdded: randomDate.toISOString().split('T')[0],
            dob: randomDob.toISOString().split('T')[0],
            gender: genders[Math.floor(Math.random() * genders.length)],
            ageGroup: calculatedAgeGroup,
        };
    })
];
