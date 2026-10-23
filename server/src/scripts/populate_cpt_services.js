/**
 * populate_cpt_services.js
 * Parses 2024 CPT Radiology codes + Essential Laboratory Tests and populates the Services collection.
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Service = require('../models/Service');
const User = require('../models/User');

// Helper to determine anatomical body part
function detectBodyPart(name, section) {
    const text = (name + ' ' + section).toLowerCase();
    if (text.includes('brain') || text.includes('head') || text.includes('skull') || text.includes('orbit') || text.includes('sinus') || text.includes('facial') || text.includes('mandible') || text.includes('tmj') || text.includes('mastoid') || text.includes('spectroscopy')) {
        return 'Head & Brain';
    }
    if (text.includes('cervical') || text.includes('cerv') || text.includes('lumbar') || text.includes('thoracic') || text.includes('spine') || text.includes('sacrum') || text.includes('coccyx') || text.includes('scoliosis')) {
        return 'Spine';
    }
    if (text.includes('neck') || text.includes('thyroid') || text.includes('parathyroid') || text.includes('carotid')) {
        return 'Neck';
    }
    if (text.includes('breast')) {
        return 'Breast';
    }
    if (text.includes('chest') || text.includes('lung') || text.includes('coronary') || text.includes('cardiac') || text.includes('myocardial') || text.includes('rib') || text.includes('sternum') || text.includes('clavicle') || text.includes('aorta')) {
        return 'Chest & Heart';
    }
    if (text.includes('abdomen') || text.includes('abd') || text.includes('liver') || text.includes('pancreas') || text.includes('panc') || text.includes('kidney') || text.includes('renal') || text.includes('spleen') || text.includes('gallbladder') || text.includes('biliary') || text.includes('esophagus') || text.includes('barium') || text.includes('gi tract') || text.includes('small bowel') || text.includes('colon') || text.includes('stomach') || text.includes('fibroscan') || text.includes('hida')) {
        return 'Abdomen';
    }
    if (text.includes('pelvis') || text.includes('urogram') || text.includes('prostate') || text.includes('psma') || text.includes('transvaginal') || text.includes('obstetric') || text.includes(' ob ') || text.includes('testicular') || text.includes('uterine') || text.includes('bladder')) {
        return 'Pelvis & Reproductive';
    }
    if (text.includes('shoulder') || text.includes('humerus') || text.includes('elbow') || text.includes('forearm') || text.includes('wrist') || text.includes('hand') || text.includes('finger') || text.includes('upper ext') || text.includes('upper extremity') || text.includes('scapula')) {
        return 'Upper Extremity';
    }
    if (text.includes('hip') || text.includes('femur') || text.includes('knee') || text.includes('tibia') || text.includes('fibula') || text.includes('ankle') || text.includes('foot') || text.includes('heel') || text.includes('calcaneus') || text.includes('toe') || text.includes('lower ext') || text.includes('lower extremity')) {
        return 'Lower Extremity';
    }
    if (text.includes('whole body') || text.includes('bone survey') || text.includes('bone age') || text.includes('bone scan') || text.includes('bone density') || text.includes('dexa') || text.includes('mid thigh')) {
        return 'Whole Body & Skeletal';
    }
    return 'General';
}

// Helper to clean and format procedure name
function formatProcedureName(rawName, section) {
    let name = rawName.trim();
    // Normalize abbreviations
    name = name
        .replace(/w\/o contrast/gi, 'Without Contrast')
        .replace(/w\/ contrast/gi, 'With Contrast')
        .replace(/w\/ & w\/o contrast/gi, 'With & Without Contrast')
        .replace(/w\/ and\/or w\/o contrast/gi, 'With and/or Without Contrast')
        .replace(/w\/ contrast\/noncontrast/gi, 'With / Without Contrast')
        .replace(/noncontrast/gi, 'Without Contrast')
        .replace(/\blow ext\b/gi, 'Lower Extremity')
        .replace(/\bupper ext\b/gi, 'Upper Extremity')
        .replace(/\bcerv\b/gi, 'Cervical')
        .replace(/\babd\b/gi, 'Abdomen')
        .replace(/\bfluoro\b/gi, 'Fluoroscopy')
        .replace(/\bmammo\b/gi, 'Mammography')
        .replace(/\bus\b/gi, 'Ultrasound')
        .replace(/\bext\b/gi, 'Extremity');

    // Title-case while preserving acronyms
    name = name.split(' ').map(w => {
        const u = w.toUpperCase();
        if (['CT', 'MRI', 'MRA', 'PET/CT', 'PET-CT', 'US', 'X-RAY', 'FNA', 'AAA', 'OB', 'DEXA', 'IVP', 'TMJ', 'GI', 'UGI', 'SB', 'KUB', 'TBS', 'FRAX', 'FDG', 'PSMA', 'MAG', 'MUGA', 'SPECT', 'FFR'].includes(u)) {
            return u;
        }
        if (w.toLowerCase() === 'and/or') return 'and/or';
        if (w.toLowerCase() === 'with') return 'With';
        if (w.toLowerCase() === 'without') return 'Without';
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    }).join(' ');

    // Prefix with modality if missing
    if (section.startsWith('CT') && !name.toUpperCase().startsWith('CT')) {
        name = `CT Scan - ${name}`;
    } else if (section.startsWith('CT') && name.toUpperCase().startsWith('CT') && !name.includes(' - ')) {
        name = name.replace(/^CT\s+/i, 'CT Scan - ');
    } else if (section.startsWith('MRI') && !name.toUpperCase().startsWith('MR')) {
        name = `MRI - ${name}`;
    } else if (section.startsWith('MRI') && name.toUpperCase().startsWith('MRI') && !name.includes(' - ')) {
        name = name.replace(/^MRI\s+/i, 'MRI - ');
    } else if (section.startsWith('MRI') && name.toUpperCase().startsWith('MRA') && !name.includes(' - ')) {
        name = name.replace(/^MRA\s+/i, 'MRA - ');
    } else if (section.startsWith('US') && !name.toUpperCase().startsWith('ULTRASOUND')) {
        name = name.replace(/^US\s+/i, 'Ultrasound - ');
    } else if (section.startsWith('X-RAY') && !name.toUpperCase().startsWith('X-RAY')) {
        name = `X-Ray - ${name}`;
    } else if (section.startsWith('X-RAY') && name.toUpperCase().startsWith('X-RAY') && !name.includes(' - ')) {
        name = name.replace(/^X-RAY\s+/i, 'X-Ray - ');
    }

    return name;
}

// Generate tailored clinical description
function generateDescription(name, modality, bodyPart, contrast) {
    let contrastText = '';
    if (contrast === 'with') contrastText = ' using intravenous contrast material for enhanced tissue and vascular visualization';
    else if (contrast === 'without') contrastText = ' without intravenous contrast';
    else if (contrast === 'with_and_without') contrastText = ' performing both non-contrast and contrast-enhanced phases';

    if (modality === 'CT') {
        return `Diagnostic Computed Tomography (CT) scan of the ${bodyPart.toLowerCase()}${contrastText}. Generates detailed thin-slice cross-sectional imaging to assess anatomy, internal structures, and pathological changes.`;
    }
    if (modality === 'MRI') {
        return `High-resolution Magnetic Resonance Imaging (MRI) examination of the ${bodyPart.toLowerCase()}${contrastText}. Utilizes strong magnetic fields and radiofrequency pulses to generate superior soft-tissue contrast and anatomical detail.`;
    }
    if (modality === 'X-Ray') {
        return `Diagnostic digital radiography (X-Ray) of the ${bodyPart.toLowerCase()}. Produces rapid 2D diagnostic images to examine skeletal alignment, joint spaces, bone integrity, or soft tissue structures.`;
    }
    if (modality === 'Ultrasound') {
        return `Real-time diagnostic ultrasound sonography of the ${bodyPart.toLowerCase()}. Uses non-invasive high-frequency sound waves to visualize internal organs, vascular hemodynamics, and soft tissue architecture.`;
    }
    if (modality === 'Mammography') {
        return `High-definition digital mammography examination of the breast tissue. Provides specialized low-dose X-ray imaging for precise detection of microcalcifications, masses, and breast architecture.`;
    }
    if (modality === 'Fluoroscopy') {
        return `Continuous real-time fluoroscopic dynamic imaging of the ${bodyPart.toLowerCase()} to evaluate functional transit, organ motility, and structural morphology.`;
    }
    if (modality === 'PET-CT' || modality === 'Nuclear Medicine') {
        return `Advanced molecular and metabolic nuclear diagnostic imaging of the ${bodyPart.toLowerCase()} combining functional radiotracer uptake with anatomic precision.`;
    }
    return `Specialized diagnostic radiology procedure evaluating the ${bodyPart.toLowerCase()} for targeted clinical assessment and diagnostic reporting.`;
}

// Generate tailored clinical uses
function generateUses(name, modality, bodyPart) {
    const bp = bodyPart.toLowerCase();
    if (bp.includes('head') || bp.includes('brain')) {
        return 'Indicated for evaluating headaches, neurological deficits, acute stroke, intracranial hemorrhage, brain tumors, seizures, head trauma, and vascular malformations.';
    }
    if (bp.includes('spine')) {
        return 'Indicated for chronic back/neck pain, radiculopathy, disc herniation, spinal stenosis, trauma, vertebral fractures, and degenerative disc disease.';
    }
    if (bp.includes('chest') || bp.includes('heart')) {
        return 'Indicated for investigating chest pain, chronic cough, shortness of breath, pulmonary nodules, pneumonia, pulmonary embolism, cardiac function, and aortic pathology.';
    }
    if (bp.includes('abdomen')) {
        return 'Indicated for investigating abdominal pain, acute pancreatitis, appendicitis, liver lesions, renal calculi, bowel obstruction, and oncological staging.';
    }
    if (bp.includes('pelvis') || bp.includes('reproductive')) {
        return 'Indicated for evaluating pelvic pain, urinary symptoms, prostate abnormalities, gynecological masses, fibroids, testicular swelling, and obstetrical monitoring.';
    }
    if (bp.includes('breast')) {
        return 'Indicated for routine breast cancer screening, diagnostic evaluation of palpable lumps, nipple discharge, abnormal mammographic findings, and tissue biopsy.';
    }
    if (bp.includes('extremity')) {
        return 'Indicated for assessing joint pain, sports injuries, ligamentous/meniscal tears, fractures, arthritis, vascular insufficiency, and deep vein thrombosis (DVT).';
    }
    if (bp.includes('skeletal') || bp.includes('whole body')) {
        return 'Indicated for bone mineral density evaluation (osteoporosis), pediatric growth assessment, skeletal survey for metabolic disease, and metastatic bone disease evaluation.';
    }
    return 'Used for comprehensive clinical diagnosis, pathology staging, trauma evaluation, and treatment planning.';
}

// Determine appropriate NGN pricing based on modality and complexity
function determinePrice(modality, contrast, name) {
    const text = name.toLowerCase();
    if (modality === 'PET-CT') return 220000;
    if (modality === 'Nuclear Medicine') return 145000;
    if (modality === 'Fluoroscopy') return 55000;
    if (modality === 'Mammography') {
        if (text.includes('biopsy')) return 95000;
        if (text.includes('3d') || text.includes('bilateral')) return 50000;
        return 38000;
    }
    if (modality === 'MRI') {
        if (text.includes('biopsy') || text.includes('spectroscopy') || text.includes('urogram')) return 135000;
        if (contrast === 'with_and_without') return 120000;
        if (contrast === 'with') return 105000;
        return 85000;
    }
    if (modality === 'CT') {
        if (text.includes('angio') || text.includes('coronary') || text.includes('colonography')) return 85000;
        if (contrast === 'with_and_without') return 75000;
        if (contrast === 'with') return 65000;
        return 50000;
    }
    if (modality === 'Ultrasound') {
        if (text.includes('biopsy') || text.includes('fna')) return 65000;
        if (text.includes('doppler') || text.includes('duplex') || text.includes('echocardiogram')) return 40000;
        if (text.includes('complete') || text.includes('bilateral')) return 28000;
        return 20000;
    }
    if (modality === 'X-Ray') {
        if (text.includes('dexa')) return 35000;
        if (text.includes('survey') || text.includes('scoliosis') || text.includes('5 views') || text.includes('6 views')) return 28000;
        if (text.includes('3 views') || text.includes('4 views')) return 20000;
        return 15000;
    }
    if (modality === 'Interventional Radiology') {
        if (text.includes('embolization')) return 280000;
        if (text.includes('biopsy')) return 110000;
        return 75000;
    }
    return 45000;
}

// Determine procedure duration in minutes
function determineDuration(modality, contrast) {
    if (modality === 'MRI') return contrast === 'with_and_without' ? 60 : 45;
    if (modality === 'CT') return contrast === 'with' || contrast === 'with_and_without' ? 30 : 20;
    if (modality === 'Ultrasound') return 30;
    if (modality === 'X-Ray') return 15;
    if (modality === 'Mammography') return 30;
    if (modality === 'Fluoroscopy') return 45;
    if (modality === 'PET-CT' || modality === 'Nuclear Medicine') return 90;
    if (modality === 'Interventional Radiology') return 60;
    return 30;
}

// Generate patient preparation instructions
function generatePreparation(modality, contrast) {
    if (contrast === 'with' || contrast === 'with_and_without') {
        return 'Fast for 4-6 hours prior to the scan (water is allowed). Please inform your provider of any kidney disease, diabetes, or contrast allergies. A recent serum creatinine test may be required.';
    }
    if (modality === 'MRI') {
        return 'Please remove all metallic objects, jewelry, watches, and piercings. Inform staff if you have a cardiac pacemaker, aneurysm clips, cochlear implants, or claustrophobia.';
    }
    if (modality === 'Ultrasound') {
        return 'For abdominal scans, fast for 6 hours before the appointment. For pelvic, obstetric, or bladder scans, drink 1 litre of water 1 hour before the exam and do not empty your bladder.';
    }
    if (modality === 'Mammography') {
        return 'Do not apply deodorant, talcum powder, lotions, or perfume around the breasts or underarms on the day of the exam. Wear a two-piece outfit for convenience.';
    }
    if (modality === 'Fluoroscopy') {
        return 'Fasting from midnight before the exam is typically required. Specific oral contrast or bowel preparation instructions will be provided prior to the test.';
    }
    return 'Wear comfortable, loose-fitting clothing without metal zippers or snaps. No special fasting is required.';
}

// Essential Laboratory Tests to add alongside radiology
const ESSENTIAL_LAB_TESTS = [
    {
        name: 'Full Blood Count (FBC) with Differential',
        description: 'Comprehensive haematology profile measuring red blood cells, white blood cells, platelets, haemoglobin, and haematocrit with 5-part differential.',
        uses: 'Used to diagnose anaemia, leukaemia, active infections, inflammation, and bleeding disorders.',
        codes: [{ system: 'LOINC', code: '58410-2' }],
        specimen: 'Venous Whole Blood (EDTA)',
        price: 7500,
        duration: 10,
        fasting: false,
        turnaround: { min: 2, max: 6, unit: 'hours' },
        preparation: 'No fasting required. Stay well hydrated.'
    },
    {
        name: 'Comprehensive Metabolic Panel (CMP)',
        description: 'Measures 14 blood substances including kidney function (BUN, creatinine), liver enzymes (ALT, AST, ALP), electrolytes (Na, K, Cl, CO2), glucose, and protein levels.',
        uses: 'Evaluates organ function, metabolic balance, kidney status, liver health, and blood sugar control.',
        codes: [{ system: 'LOINC', code: '24323-8' }],
        specimen: 'Serum or Heparin Plasma',
        price: 18000,
        duration: 15,
        fasting: true,
        turnaround: { min: 4, max: 12, unit: 'hours' },
        preparation: 'Overnight fasting (8-12 hours) recommended. Water is permitted.'
    },
    {
        name: 'Lipid Profile (Cholesterol Panel)',
        description: 'Measures total cholesterol, high-density lipoprotein (HDL), low-density lipoprotein (LDL), very-low-density lipoprotein (VLDL), and triglycerides.',
        uses: 'Assesses cardiovascular risk, hyperlipidaemia, and guides statin or lipid-lowering therapy.',
        codes: [{ system: 'LOINC', code: '57698-3' }],
        specimen: 'Serum',
        price: 12000,
        duration: 10,
        fasting: true,
        turnaround: { min: 4, max: 12, unit: 'hours' },
        preparation: 'Fasting for 9-12 hours required before blood draw.'
    },
    {
        name: 'Glycated Haemoglobin (HbA1c)',
        description: 'Measures the average percentage of blood glucose bound to haemoglobin over the preceding 2 to 3 months.',
        uses: 'Diagnostic standard for type 2 diabetes and monitoring long-term glycaemic control.',
        codes: [{ system: 'LOINC', code: '4548-4' }],
        specimen: 'Venous Whole Blood (EDTA)',
        price: 9500,
        duration: 10,
        fasting: false,
        turnaround: { min: 2, max: 6, unit: 'hours' },
        preparation: 'No special fasting is required.'
    },
    {
        name: 'Renal Function Test (Electrolytes, Urea & Creatinine - EUCR)',
        description: 'Evaluates serum sodium, potassium, chloride, bicarbonate, blood urea nitrogen, and creatinine with estimated Glomerular Filtration Rate (eGFR).',
        uses: 'Essential for screening kidney disease, monitoring hypertension, and assessing contrast dye clearance.',
        codes: [{ system: 'LOINC', code: '24362-6' }],
        specimen: 'Serum',
        price: 11000,
        duration: 10,
        fasting: false,
        turnaround: { min: 3, max: 8, unit: 'hours' },
        preparation: 'Maintain normal hydration before testing.'
    },
    {
        name: 'Liver Function Tests (LFTs)',
        description: 'Measures total bilirubin, conjugated bilirubin, alanine aminotransferase (ALT), aspartate aminotransferase (AST), alkaline phosphatase (ALP), and total protein / albumin.',
        uses: 'Detects hepatitis, cirrhosis, gallstones, drug-induced liver toxicity, and hepatic synthesis capability.',
        codes: [{ system: 'LOINC', code: '24325-3' }],
        specimen: 'Serum',
        price: 13500,
        duration: 10,
        fasting: true,
        turnaround: { min: 4, max: 12, unit: 'hours' },
        preparation: 'Fasting for 6-8 hours prior to test is recommended.'
    },
    {
        name: 'Thyroid Function Profile (TSH, Free T3, Free T4)',
        description: 'Comprehensive endocrinology assessment of thyroid-stimulating hormone (TSH), free triiodothyronine (FT3), and free thyroxine (FT4).',
        uses: 'Investigates hypothyroidism, hyperthyroidism, goitre, unexplained fatigue, and metabolic rate variations.',
        codes: [{ system: 'LOINC', code: '24348-5' }],
        specimen: 'Serum',
        price: 19500,
        duration: 10,
        fasting: false,
        turnaround: { min: 6, max: 24, unit: 'hours' },
        preparation: 'Best collected in the morning. Inform provider of thyroid medications.'
    },
    {
        name: 'Urinalysis Complete with Microscopy',
        description: 'Physical, chemical, and microscopic examination of urine checking for protein, glucose, ketones, leukocytes, nitrites, and cellular casts.',
        uses: 'Detects urinary tract infections (UTI), kidney disorders, diabetes, and haematuria.',
        codes: [{ system: 'LOINC', code: '24356-8' }],
        specimen: 'Clean-catch midstream urine',
        price: 4500,
        duration: 10,
        fasting: false,
        turnaround: { min: 2, max: 4, unit: 'hours' },
        preparation: 'Collect a clean-catch midstream urine sample in the provided sterile container.'
    },
    {
        name: 'Prostate-Specific Antigen (PSA) Total & Free',
        description: 'Measures total PSA and percentage of free PSA in the bloodstream to evaluate prostate gland pathology.',
        uses: 'Screening and monitoring for benign prostatic hyperplasia (BPH), prostatitis, and prostate cancer.',
        codes: [{ system: 'LOINC', code: '2857-1' }],
        specimen: 'Serum',
        price: 15000,
        duration: 10,
        fasting: false,
        turnaround: { min: 6, max: 24, unit: 'hours' },
        preparation: 'Avoid vigorous exercise or sexual intercourse for 48 hours prior to testing.'
    }
];

async function main() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected successfully to MongoDB.');

        // Find primary provider
        const primaryUser = await User.findOne({ email: 'enaikeleomoh@gmail.com' });
        const targetProviderId = primaryUser ? primaryUser.id : 'sSgDBhat0H';
        console.log(`Target primary provider ID: ${targetProviderId} (${primaryUser ? primaryUser.email : 'fallback'})`);

        // Read extracted CPT items
        const jsonPath = path.join(__dirname, '../../../../.gemini/antigravity-ide/brain/6e4e590d-6584-4142-844d-fa98be91f6d8/scratch/extracted_cpt_items.json');
        if (!fs.existsSync(jsonPath)) {
            throw new Error(`Extracted JSON file not found at: ${jsonPath}`);
        }
        const rawItems = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        console.log(`Read ${rawItems.length} raw extracted CPT items.`);

        const processedServices = [];
        const seenCodes = new Set();

        for (const item of rawItems) {
            const rawCode = (item.code || '').trim();
            const rawName = (item.name || '').trim();
            const section = (item.section || '').trim().toUpperCase();

            if (!rawCode || !rawName) continue;

            // Handle compound rows if any (e.g. "CT KIDNEY-PELVIS w/ & w/o contrast also add...")
            let namesToProcess = [rawName];
            if (rawName.includes('also add')) {
                const parts = rawName.split(/also add|,/);
                namesToProcess = parts.map(p => p.trim()).filter(Boolean);
            }

            for (const nameCandidate of namesToProcess) {
                // Determine modality
                let modality = 'CT';
                let category = 'scans';
                let serviceType = 'radiology';

                if (section.startsWith('CT')) {
                    modality = 'CT';
                } else if (section.startsWith('MRI')) {
                    modality = 'MRI';
                } else if (section.startsWith('US')) {
                    modality = 'Ultrasound';
                } else if (section.startsWith('X-RAY')) {
                    modality = 'X-Ray';
                } else if (section.startsWith('MAMMO')) {
                    modality = 'Mammography';
                } else if (section.startsWith('FLUORO')) {
                    modality = 'Fluoroscopy';
                } else if (section.startsWith('NUCLEAR PET/CT')) {
                    modality = 'PET-CT';
                } else if (section.startsWith('NUCLEAR')) {
                    modality = 'Nuclear Medicine';
                } else if (section.startsWith('MISC')) {
                    modality = 'Interventional Radiology';
                }

                // Determine contrast
                let contrast = 'not_applicable';
                const lower = nameCandidate.toLowerCase();
                if (lower.includes('w/ & w/o contrast') || lower.includes('w/ and/or w/o') || lower.includes('contrast/noncontrast')) {
                    contrast = 'with_and_without';
                } else if (lower.includes('w/ contrast') || lower.includes('with contrast') || lower.includes('with air')) {
                    contrast = 'with';
                } else if (lower.includes('w/o contrast') || lower.includes('without contrast') || lower.includes('noncontrast')) {
                    contrast = 'without';
                }

                // Determine laterality
                let laterality = 'not_applicable';
                if (lower.includes('bilateral')) laterality = 'bilateral';
                else if (lower.includes('unilateral')) laterality = 'unilateral';
                else if (lower.includes('left or right') || lower.includes('l / r')) laterality = 'unilateral';

                const formattedName = formatProcedureName(nameCandidate, section);
                const bodyPart = detectBodyPart(formattedName, section);
                const description = generateDescription(formattedName, modality, bodyPart, contrast);
                const uses = generateUses(formattedName, modality, bodyPart);
                const price = determinePrice(modality, contrast, formattedName);
                const duration = determineDuration(modality, contrast);
                const preparation = generatePreparation(modality, contrast);

                // Unique key to prevent duplicates
                const uniqueKey = `${rawCode}_${formattedName.toLowerCase()}`;
                if (seenCodes.has(uniqueKey)) continue;
                seenCodes.add(uniqueKey);

                processedServices.push({
                    provider_id: targetProviderId,
                    category,
                    service_type: serviceType,
                    modality,
                    name: formattedName,
                    description,
                    uses,
                    codes: [{ system: 'CPT', code: rawCode }],
                    body_part: bodyPart,
                    procedure_details: {
                        contrast,
                        laterality
                    },
                    price,
                    currency: 'NGN',
                    duration,
                    preparation,
                    requirements: ["Doctor's referral", 'Relevant medical history'],
                    report_turnaround: {
                        min: modality === 'X-Ray' || modality === 'Ultrasound' ? 12 : 24,
                        max: modality === 'X-Ray' || modality === 'Ultrasound' ? 24 : 48,
                        unit: 'hours'
                    },
                    is_available: true,
                    metadata: {
                        cpt_section: section,
                        cpt_source: '2024 RADIOLOGY CPT CODES'
                    }
                });
            }
        }

        console.log(`Generated ${processedServices.length} structured radiology service objects from CPT PDF.`);

        // Add Essential Laboratory Tests
        for (const lab of ESSENTIAL_LAB_TESTS) {
            processedServices.push({
                provider_id: targetProviderId,
                category: 'tests',
                service_type: 'laboratory',
                modality: null,
                name: lab.name,
                description: lab.description,
                uses: lab.uses,
                codes: lab.codes,
                body_part: null,
                procedure_details: {
                    specimen: lab.specimen,
                    fasting_required: lab.fasting
                },
                price: lab.price,
                currency: 'NGN',
                duration: lab.duration,
                preparation: lab.preparation,
                requirements: ["Doctor's requisition / referral"],
                report_turnaround: lab.turnaround,
                is_available: true,
                metadata: {
                    standard: 'LOINC'
                }
            });
        }

        console.log(`Total services to populate (including Labs): ${processedServices.length}`);

        // Insert / Upsert into MongoDB
        let insertedCount = 0;
        let updatedCount = 0;

        for (const s of processedServices) {
            // Find existing by primary code or exact name + provider
            const query = {
                $or: [
                    { 'codes.code': s.codes[0].code, provider_id: s.provider_id },
                    { name: s.name, provider_id: s.provider_id }
                ]
            };

            const existing = await Service.findOne(query);
            if (existing) {
                await Service.updateOne({ _id: existing._id }, { $set: s });
                updatedCount++;
            } else {
                await Service.create(s);
                insertedCount++;
            }
        }

        console.log(`Population Complete!`);
        console.log(`  Inserted: ${insertedCount}`);
        console.log(`  Updated:  ${updatedCount}`);
        console.log(`  Total in DB now: ${await Service.countDocuments()}`);

        // Sample check
        const sampleCt = await Service.findOne({ 'codes.code': '70460' });
        console.log('\n--- Sample CT Brain With Contrast (70460) in DB ---');
        console.log(JSON.stringify(sampleCt, null, 2));

        const sampleMri = await Service.findOne({ 'codes.code': '70551' });
        console.log('\n--- Sample MRI Brain Without Contrast (70551) in DB ---');
        console.log(JSON.stringify(sampleMri, null, 2));

        const sampleFbc = await Service.findOne({ 'codes.code': '58410-2' });
        console.log('\n--- Sample Full Blood Count (58410-2) in DB ---');
        console.log(JSON.stringify(sampleFbc, null, 2));

        await mongoose.disconnect();
        console.log('\nDatabase connection closed. Done!');
    } catch (err) {
        console.error('Error populating CPT services:', err);
        process.exit(1);
    }
}

main();
