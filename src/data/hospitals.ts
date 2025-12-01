export interface Hospital {
    id: string;
    name: string;
    rating: {
        score: number;
        reviews: number;
    };
    address: string;
    openStatus: string;
    phone: string;
    dateListed: string;
    timeListed: string;
    specialOffer: boolean;
    image?: string;
}

export const hospitals: Hospital[] = [
    {
        id: "1",
        name: "Phoebe Medical Center",
        rating: { score: 5.0, reviews: 80 },
        address: "24 Adeola Odeku Street, VI, Lagos",
        openStatus: "Open 24 hours",
        phone: "0814 609 2019",
        dateListed: "2025-07-30",
        timeListed: "10:00 AM",
        specialOffer: false
    },
    {
        id: "2",
        name: "Cottage Medicare Hospital",
        rating: { score: 4.0, reviews: 60 },
        address: "18 Iwaya Rd, Yaba 101245, Lagos",
        openStatus: "Open 24 hours",
        phone: "0814 609 2019",
        dateListed: "2025-07-30",
        timeListed: "10:00 AM",
        specialOffer: false
    },
    {
        id: "3",
        name: "Blue Cross Hospital",
        rating: { score: 5.0, reviews: 60 },
        address: "48 Jajiye Rd, Ogba, (Besides UBA, Ikeja)",
        openStatus: "Open 24 hours",
        phone: "0814 609 2019",
        dateListed: "2025-07-30",
        timeListed: "10:00 AM",
        specialOffer: false
    },
    {
        id: "4",
        name: "First City Hospital",
        rating: { score: 5.0, reviews: 60 },
        address: "1B, Williams Street, Off Diya street, Berger, Lagos",
        openStatus: "Open 24 hours",
        phone: "0814 609 2019",
        dateListed: "2025-07-30",
        timeListed: "10:00 AM",
        specialOffer: false
    },
    {
        id: "5",
        name: "Lagos General Hospital",
        rating: { score: 4.5, reviews: 120 },
        address: "15 Marina Road, Lagos Island",
        openStatus: "Open 24 hours",
        phone: "0814 609 2020",
        dateListed: "2025-07-30",
        timeListed: "10:00 AM",
        specialOffer: true
    },
    {
        id: "6",
        name: "Victoria Medical Center",
        rating: { score: 4.8, reviews: 95 },
        address: "32 Victoria Island, Lagos",
        openStatus: "Open 24 hours",
        phone: "0814 609 2021",
        dateListed: "2025-07-30",
        timeListed: "10:00 AM",
        specialOffer: false
    },
    {
        id: "7",
        name: "Ikeja Medical Hospital",
        rating: { score: 4.2, reviews: 75 },
        address: "45 Allen Avenue, Ikeja, Lagos",
        openStatus: "Open 24 hours",
        phone: "0814 609 2022",
        dateListed: "2025-07-30",
        timeListed: "10:00 AM",
        specialOffer: false
    },
    {
        id: "8",
        name: "Surulere Health Center",
        rating: { score: 4.6, reviews: 85 },
        address: "78 Bode Thomas Street, Surulere",
        openStatus: "Open 24 hours",
        phone: "0814 609 2023",
        dateListed: "2025-07-30",
        timeListed: "10:00 AM",
        specialOffer: true
    },
    {
        id: "9",
        name: "Lekki Medical Center",
        rating: { score: 4.9, reviews: 110 },
        address: "12 Admiralty Way, Lekki Phase 1",
        openStatus: "Open 24 hours",
        phone: "0814 609 2024",
        dateListed: "2025-07-30",
        timeListed: "10:00 AM",
        specialOffer: false
    },
    {
        id: "10",
        name: "Yaba Medical Hospital",
        rating: { score: 4.3, reviews: 70 },
        address: "25 Herbert Macaulay Way, Yaba",
        openStatus: "Open 24 hours",
        phone: "0814 609 2025",
        dateListed: "2025-07-30",
        timeListed: "10:00 AM",
        specialOffer: false
    },
    {
        id: "11",
        name: "Oshodi General Hospital",
        rating: { score: 4.7, reviews: 90 },
        address: "8 Oshodi Expressway, Oshodi",
        openStatus: "Open 24 hours",
        phone: "0814 609 2026",
        dateListed: "2025-07-30",
        timeListed: "10:00 AM",
        specialOffer: true
    },
    {
        id: "12",
        name: "Alimosho Medical Center",
        rating: { score: 4.4, reviews: 65 },
        address: "15 Alimosho Road, Alimosho",
        openStatus: "Open 24 hours",
        phone: "0814 609 2027",
        dateListed: "2025-07-30",
        timeListed: "10:00 AM",
        specialOffer: false
    }
]; 