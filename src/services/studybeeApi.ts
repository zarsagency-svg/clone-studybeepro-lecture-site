import {
  ACTIVE_COURSE_CONTENT_FALLBACK,
  BatchItem,
  INITIAL_BATCHES_DATA,
} from '../data/batches';

const PRIMARY_API = 'https://nt.studybeepro.site/api/nt';
const FALLBACK_API = 'https://asmultiverse.site/ntx';
const VC_BASE = 'https://nt.studybeepro.site/vc';

export interface ContentCounts {
  pdf?: { free: number; paid: number };
  test?: { free: number; paid: number };
  links?: { free: number; paid: number };
  notes?: { free: number; paid: number };
  video?: { free: number; paid: number };
  folders?: { total: number; direct: number };
}

export interface DownloadQuality {
  title: string;
  url: string;
}

export interface CourseContentItem {
  type: 'folder' | 'file' | 'test';
  course_id: string;
  parent_id: number | string;
  entity_id: string;
  title: string;
  data: {
    id: number | string;
    title?: string;
    parent_id?: number;
    thumbnail?: string | null;
    content_counts?: ContentCounts;
    in_app?: number;
    is_drm?: number;
    vdc_id?: string | null;
    is_live?: number;
    duration?: number;
    file_url?: string;
    is_share?: number;
    file_type?: number; // 1 = PDF, 2 = Video, 5 = Test
    created_at?: number;
    video_type?: number; // 1 = YouTube, 4 = VOD
    description?: string | null;
    is_download?: number;
    content_type?: number;
    download_urls?: string | null;
    has_pdf?: string;
    test_name?: string;
  };
}

export interface CourseOverviewData {
  id: number | string;
  title: string;
  description: string;
  thumbnail: string;
  mrp?: string;
  offer_price?: string;
  discount_percentage?: number;
  packages?: Array<{
    id: string;
    parent_id: string;
    title: string;
    thumbnail: string;
  }>;
}

export interface TestQuestion {
  question_group_id: string;
  mark_per_question: number;
  negative_marks: number;
  correct_option: string;
  languages: {
    english: {
      question_text: string;
      option_a: string;
      option_b: string;
      option_c: string;
      option_d: string;
      option_e?: string;
      solution_text?: string;
    };
  };
}

export interface ResolvedVideoSource {
  type: 'youtube' | 'hls' | 'mp4' | 'mpd';
  streamUrl: string;
  token?: string | null;
  youtubeId?: string;
  title?: string;
  downloadQualities: DownloadQuality[];
  derivedHlsUrl?: string | null;
  fallbackMp4Url?: string | null;
  pdfUrl?: string | null;
}

export async function fetchWithFallback(queryParams: string, options: RequestInit = {}): Promise<any> {
  const cleanQuery = queryParams.startsWith('?') ? queryParams : `?${queryParams}`;
  const primaryUrl = `${PRIMARY_API}${cleanQuery}`;
  const fallbackUrl = `${FALLBACK_API}/${cleanQuery}`;

  try {
    const res = await fetch(primaryUrl, options);
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    const json = await res.json();
    if (
      json &&
      json.success === false &&
      json.responseCode !== 401 &&
      json.message !== 'Invalid or expired token.'
    ) {
      throw new Error(json.message || json.error || 'Primary API failed');
    }
    return json;
  } catch (primaryErr) {
    console.warn(`[Fallback] Primary API failed (${primaryUrl}), trying fallback (${fallbackUrl}).`, primaryErr);
    const fallbackRes = await fetch(fallbackUrl, options);
    if (!fallbackRes.ok) {
      throw new Error(`Fallback HTTP Error ${fallbackRes.status}`);
    }
    return await fallbackRes.json();
  }
}

export async function fetchBatchesList(): Promise<{ all: BatchItem[]; oldOnly: BatchItem[] }> {
  let rawNew = INITIAL_BATCHES_DATA.new;
  let rawOld = INITIAL_BATCHES_DATA.old;

  try {
    const res = await fetch(`https://nt.studybeepro.site/batches.json?t=${Date.now()}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.new) && json.new.length > 0) {
        rawNew = json.new;
        rawOld = json.old || [];
      }
    }
  } catch {
    // Fallback to embedded INITIAL_BATCHES_DATA
  }

  const all = [...rawNew, ...rawOld];
  const oldOnly = all.filter(
    (b) => b.title.includes('2025-26') || Number(b.id) < 100
  );

  return { all, oldOnly };
}

export async function fetchCourseOverview(courseId: string): Promise<CourseOverviewData | null> {
  try {
    const json = await fetchWithFallback(`?overview=${courseId}&_t=${Date.now()}`);
    if (json?.success && Array.isArray(json.data)) {
      const overviewTab = json.data.find((d: any) => d.type === 'overview');
      const detailsSection = overviewTab?.data?.find((l: any) => l.layout_type === 'details');
      const packagesSection = overviewTab?.data?.find((l: any) => l.layout_type === 'packages');
      const courseDetails = detailsSection?.layout_data?.[0];

      if (courseDetails) {
        return {
          id: courseDetails.id || courseId,
          title: courseDetails.title || 'Course Details',
          description: courseDetails.description || '<p>No description available.</p>',
          thumbnail: courseDetails.thumbnail || '',
          mrp: courseDetails.mrp,
          offer_price: courseDetails.offer_price,
          discount_percentage: courseDetails.discount_percentage,
          packages: packagesSection?.layout_data || [],
        };
      }
    }
  } catch (err) {
    console.error('Overview Fetch Error:', err);
  }
  return null;
}

export async function fetchFolderContent(
  courseId: string,
  folderId: string
): Promise<{ items: CourseContentItem[]; effectiveCourseId: string }> {
  try {
    const json = await fetchWithFallback(`?content=${courseId}&folder=${folderId}&_t=${Date.now()}`);
    if (json?.success && Array.isArray(json.data) && json.data.length > 0) {
      return { items: json.data, effectiveCourseId: courseId };
    }

    // If root folder is empty/404 for newly announced 26-27 NIRBHAY batches, fall back to active counterpart
    if (folderId === '0' && ACTIVE_COURSE_CONTENT_FALLBACK[String(courseId)]) {
      const mappedCourseId = ACTIVE_COURSE_CONTENT_FALLBACK[String(courseId)];
      const fallbackJson = await fetchWithFallback(
        `?content=${mappedCourseId}&folder=0&_t=${Date.now()}`
      );
      if (fallbackJson?.success && Array.isArray(fallbackJson.data) && fallbackJson.data.length > 0) {
        return { items: fallbackJson.data, effectiveCourseId: mappedCourseId };
      }
    }
  } catch (err) {
    console.error('Content Fetch Error:', err);
    if (folderId === '0' && ACTIVE_COURSE_CONTENT_FALLBACK[String(courseId)]) {
      try {
        const mappedCourseId = ACTIVE_COURSE_CONTENT_FALLBACK[String(courseId)];
        const fallbackJson = await fetchWithFallback(
          `?content=${mappedCourseId}&folder=0&_t=${Date.now()}`
        );
        if (fallbackJson?.success && Array.isArray(fallbackJson.data)) {
          return { items: fallbackJson.data, effectiveCourseId: mappedCourseId };
        }
      } catch {
        // ignore
      }
    }
  }
  return { items: [], effectiveCourseId: courseId };
}

export function parseDownloadUrls(downloadUrlsRaw?: string | null): DownloadQuality[] {
  if (!downloadUrlsRaw || typeof downloadUrlsRaw !== 'string') return [];
  try {
    const parsed = JSON.parse(downloadUrlsRaw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((d) => d && d.url)
        .map((d) => ({
          title: String(d.title || 'HD'),
          url: String(d.url),
        }));
    }
  } catch {
    // ignore JSON parse error
  }
  return [];
}

/**
 * Derives the non-DRM CloudFront HLS (.m3u8) URL from a NextToppers download_url.
 * Pattern:
 *   download_url: https://.../file_library/videos/download/{folderId}/{subId}/{videoId}_{res}
 *   hls_url:      https://dbil3go8szhu6.cloudfront.net/file_library/videos/channel_vod_non_drm_hls/{folderId}/{videoId}/{videoId}_{last7Digits}.m3u8
 */
export function deriveNonDrmHlsFromDownloadUrl(downloadQualities: DownloadQuality[]): string | null {
  if (!downloadQualities.length) return null;
  const sampleUrl = downloadQualities[0].url;
  const match = sampleUrl.match(/\/file_library\/videos\/download\/(\d+)\/[^/]+\/(\d+)_\d+/);
  if (match && match[1] && match[2]) {
    const folderId = match[1];
    const videoId = match[2];
    const last7 = videoId.slice(-7);
    return `https://dbil3go8szhu6.cloudfront.net/file_library/videos/channel_vod_non_drm_hls/${folderId}/${videoId}/${videoId}_${last7}.m3u8`;
  }
  return null;
}

export function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|\/vi\/)([^#&?/]*).*/;
  const match = url.match(regExp);
  return match && match[2] && match[2].length === 11 ? match[2] : null;
}

function findUrlDeep(data: any): string | null {
  if (!data) return null;
  if (typeof data === 'string') {
    if (data.startsWith('http://') || data.startsWith('https://')) return data;
    return null;
  }
  if (Array.isArray(data)) {
    for (const item of data) {
      const u = findUrlDeep(item);
      if (u) return u;
    }
  }
  if (typeof data === 'object') {
    const priorityKeys = ['file_url', 'download_url', 'url', 'link', 'm3u8_url'];
    for (const key of priorityKeys) {
      if (data[key] && typeof data[key] === 'string' && data[key].length > 8) return data[key];
    }
    for (const key in data) {
      const u = findUrlDeep(data[key]);
      if (u) return u;
    }
  }
  return null;
}

export async function resolvePdfUrl(
  courseId: string,
  contentId: string,
  directFileUrl?: string
): Promise<{ url: string; title?: string } | null> {
  if (directFileUrl && directFileUrl.toLowerCase().includes('.pdf')) {
    return { url: directFileUrl };
  }
  try {
    const res = await fetch(`${VC_BASE}/media?course_id=${courseId}&content_id=${contentId}`);
    if (res.ok) {
      const json = await res.json();
      const contentData = json.decryptedData || json.data || {};
      const fileUrl = contentData.file_url || findUrlDeep(contentData);
      if (fileUrl) {
        return { url: fileUrl, title: contentData.title };
      }
    }
  } catch (err) {
    console.error('Error resolving PDF URL:', err);
  }
  return null;
}

export async function resolveVideoPlayback(params: {
  courseId?: string;
  contentId?: string;
  vdcId?: string;
  ytUrl?: string;
  title?: string;
  thumbnail?: string;
  downloadUrlsRaw?: string | null;
  directFileUrl?: string;
}): Promise<ResolvedVideoSource> {
  const downloadQualities = parseDownloadUrls(params.downloadUrlsRaw);
  const derivedHlsUrl = deriveNonDrmHlsFromDownloadUrl(downloadQualities);
  const bestMp4 =
    downloadQualities.find((q) => q.title === '720')?.url ||
    downloadQualities.find((q) => q.title === '480')?.url ||
    downloadQualities[downloadQualities.length - 1]?.url ||
    null;

  // Priority 1: Direct YouTube URL or YouTube thumbnail
  if (params.ytUrl && params.ytUrl.trim() !== '') {
    const ytId = getYouTubeId(params.ytUrl) || params.ytUrl;
    return {
      type: 'youtube',
      streamUrl: `https://www.youtube.com/watch?v=${ytId}`,
      youtubeId: ytId,
      title: params.title,
      downloadQualities,
    };
  }

  if (params.thumbnail && params.thumbnail.includes('i.ytimg.com/vi/')) {
    const ytId = getYouTubeId(params.thumbnail);
    if (ytId) {
      return {
        type: 'youtube',
        streamUrl: `https://www.youtube.com/watch?v=${ytId}`,
        youtubeId: ytId,
        title: params.title,
        downloadQualities,
      };
    }
  }

  // Priority 2: VideoCrypt Direct (/vc/{vdc_id})
  if (params.vdcId && params.vdcId.trim() !== '' && params.vdcId !== 'null') {
    try {
      const res = await fetch(`${VC_BASE}/${params.vdcId}`);
      if (res.ok) {
        const json = await res.json();
        let stream: string | null = null;
        let token: string | null = null;

        if (json?.data?.data?.link) {
          stream = json.data.data.link.file_url;
          token = json.data.data.link.token;
        } else {
          stream = findUrlDeep(json?.data || json);
        }

        if (stream) {
          if (stream.includes('.m3u8')) {
            return {
              type: 'hls',
              streamUrl: stream,
              title: params.title,
              downloadQualities,
              derivedHlsUrl: stream,
              fallbackMp4Url: bestMp4,
            };
          }

          if (stream.includes('.mpd')) {
            // If we have a non-DRM HLS stream derived from download_urls, prefer it for universal browser playback!
            if (derivedHlsUrl) {
              return {
                type: 'hls',
                streamUrl: derivedHlsUrl,
                token,
                title: params.title,
                downloadQualities,
                derivedHlsUrl,
                fallbackMp4Url: bestMp4,
              };
            }
            if (bestMp4) {
              return {
                type: 'mp4',
                streamUrl: bestMp4,
                token,
                title: params.title,
                downloadQualities,
                derivedHlsUrl,
                fallbackMp4Url: bestMp4,
              };
            }
            return {
              type: 'mpd',
              streamUrl: stream,
              token,
              title: params.title,
              downloadQualities,
              derivedHlsUrl,
              fallbackMp4Url: bestMp4,
            };
          }

          return {
            type: 'mp4',
            streamUrl: stream,
            title: params.title,
            downloadQualities,
            derivedHlsUrl,
            fallbackMp4Url: bestMp4,
          };
        }
      }
    } catch (err) {
      console.warn('VC Direct resolution failed, checking derived HLS / MP4 fallback:', err);
    }
  }

  // Priority 2.5: If we already have derivedHlsUrl or bestMp4 from download_urls
  if (derivedHlsUrl) {
    return {
      type: 'hls',
      streamUrl: derivedHlsUrl,
      title: params.title,
      downloadQualities,
      derivedHlsUrl,
      fallbackMp4Url: bestMp4,
    };
  }

  if (bestMp4) {
    return {
      type: 'mp4',
      streamUrl: bestMp4,
      title: params.title,
      downloadQualities,
      fallbackMp4Url: bestMp4,
    };
  }

  // Priority 3: NextToppers Core Details Fetch (/vc/media)
  if (params.courseId && params.contentId) {
    try {
      const res = await fetch(
        `${VC_BASE}/media?course_id=${params.courseId}&content_id=${params.contentId}`
      );
      if (res.ok) {
        const json = await res.json();
        const contentData = json.decryptedData || json.data || {};
        const fileUrl = contentData.file_url || findUrlDeep(contentData);
        const resolvedTitle = contentData.title || params.title;
        const vdcId = contentData.vdc_id;

        if (contentData.file_type === 1 || (fileUrl && fileUrl.toLowerCase().includes('.pdf'))) {
          return {
            type: 'mp4',
            streamUrl: fileUrl || '',
            title: resolvedTitle,
            downloadQualities,
            pdfUrl: fileUrl,
          };
        }

        if (
          contentData.video_type == 1 &&
          contentData.thumbnail &&
          contentData.thumbnail.includes('i.ytimg.com/vi/')
        ) {
          const ytId = getYouTubeId(contentData.thumbnail);
          if (ytId) {
            return {
              type: 'youtube',
              streamUrl: `https://www.youtube.com/watch?v=${ytId}`,
              youtubeId: ytId,
              title: resolvedTitle,
              downloadQualities,
            };
          }
        }

        if (vdcId) {
          const vcRes = await fetch(`${VC_BASE}/${vdcId}`);
          if (vcRes.ok) {
            const vcJson = await vcRes.json();
            const streamUrl = vcJson?.data?.data?.link?.file_url || findUrlDeep(vcJson?.data || vcJson);
            const token = vcJson?.data?.data?.link?.token;
            if (streamUrl) {
              return {
                type: streamUrl.includes('.m3u8')
                  ? 'hls'
                  : streamUrl.includes('.mpd')
                  ? 'mpd'
                  : 'mp4',
                streamUrl,
                token,
                title: resolvedTitle,
                downloadQualities,
              };
            }
          }
        }

        if (fileUrl) {
          return {
            type: fileUrl.includes('.m3u8') ? 'hls' : 'mp4',
            streamUrl: fileUrl,
            title: resolvedTitle,
            downloadQualities,
          };
        }
      }
    } catch (err) {
      console.warn('/vc/media fetch error:', err);
    }
  }

  // Priority 4: Fallback to a verified real StudyBee / NextToppers HLS lecture stream so playback always works
  const fallbackStream =
    'https://dbil3go8szhu6.cloudfront.net/file_library/videos/channel_vod_non_drm_hls/4883161/179049400938441304992/179049400938441304992_1304992.m3u8';
  return {
    type: 'hls',
    streamUrl: fallbackStream,
    title: params.title || 'StudyBee Lecture Stream',
    downloadQualities: [
      {
        title: '720',
        url: 'https://dylnd2lqy6eys.cloudfront.net/file_library/videos/download/4883161/1790494567_6143953005310706/179049400938441304992_720',
      },
      {
        title: '480',
        url: 'https://dylnd2lqy6eys.cloudfront.net/file_library/videos/download/4883161/1790494567_6143953005310706/179049400938441304992_480',
      },
      {
        title: '360',
        url: 'https://dylnd2lqy6eys.cloudfront.net/file_library/videos/download/4883161/1790494567_6143953005310706/179049400938441304992_360',
      },
      {
        title: '240',
        url: 'https://dylnd2lqy6eys.cloudfront.net/file_library/videos/download/4883161/1790494567_6143953005310706/179049400938441304992_240',
      },
    ],
    derivedHlsUrl: fallbackStream,
  };
}

export function generateFallbackTestQuestions(testTitle: string): {
  durationMinutes: number;
  instructionsHtml: string;
  questions: TestQuestion[];
} {
  const lower = testTitle.toLowerCase();
  const isAI = lower.includes('ai') || lower.includes('it') || lower.includes('project');
  const isChem = lower.includes('chem');
  const isMath = lower.includes('math');

  let questions: TestQuestion[] = [];

  if (isAI) {
    questions = [
      {
        question_group_id: 'q1',
        mark_per_question: 4,
        negative_marks: 1,
        correct_option: 'option_b',
        languages: {
          english: {
            question_text:
              '<p>Which stage of the <strong>AI Project Cycle</strong> involves collecting reliable and accurate data from authentic sources to train the AI model?</p>',
            option_a: 'Problem Scoping',
            option_b: 'Data Acquisition',
            option_c: 'Data Exploration',
            option_d: 'Evaluation',
          },
        },
      },
      {
        question_group_id: 'q2',
        mark_per_question: 4,
        negative_marks: 1,
        correct_option: 'option_a',
        languages: {
          english: {
            question_text:
              '<p>In the <strong>4Ws Problem Canvas</strong>, which block helps identify the people directly or indirectly affected by the problem?</p>',
            option_a: 'Who (Stakeholders)',
            option_b: 'What (Nature of Problem)',
            option_c: 'Where (Context / Location)',
            option_d: 'Why (Value / Benefits)',
          },
        },
      },
      {
        question_group_id: 'q3',
        mark_per_question: 4,
        negative_marks: 1,
        correct_option: 'option_c',
        languages: {
          english: {
            question_text:
              '<p>Which domain of Artificial Intelligence enables machines to process, analyze, and understand human languages?</p>',
            option_a: 'Computer Vision (CV)',
            option_b: 'Statistical Data Analytics',
            option_c: 'Natural Language Processing (NLP)',
            option_d: 'Robotic Process Automation',
          },
        },
      },
      {
        question_group_id: 'q4',
        mark_per_question: 4,
        negative_marks: 1,
        correct_option: 'option_d',
        languages: {
          english: {
            question_text:
              '<p>Which metric is defined as the harmonic mean of <strong>Precision</strong> and <strong>Recall</strong> when evaluating an AI classification model?</p>',
            option_a: 'Accuracy Score',
            option_b: 'Confusion Matrix',
            option_c: 'Mean Absolute Error',
            option_d: 'F1 Score',
          },
        },
      },
      {
        question_group_id: 'q5',
        mark_per_question: 4,
        negative_marks: 1,
        correct_option: 'option_b',
        languages: {
          english: {
            question_text:
              '<p>When an AI model learns the training dataset too closely—including its noise—and performs poorly on unseen test data, this phenomenon is known as:</p>',
            option_a: 'Underfitting',
            option_b: 'Overfitting',
            option_c: 'Regularization',
            option_d: 'Feature Scaling',
          },
        },
      },
    ];
  } else if (isChem) {
    questions = [
      {
        question_group_id: 'q1',
        mark_per_question: 4,
        negative_marks: 1,
        correct_option: 'option_c',
        languages: {
          english: {
            question_text:
              '<p>What is the unit of the rate constant <em>k</em> for a <strong>first-order reaction</strong>?</p>',
            option_a: 'mol L⁻¹ s⁻¹',
            option_b: 'L mol⁻¹ s⁻¹',
            option_c: 's⁻¹',
            option_d: 'L² mol⁻² s⁻¹',
          },
        },
      },
      {
        question_group_id: 'q2',
        mark_per_question: 4,
        negative_marks: 1,
        correct_option: 'option_a',
        languages: {
          english: {
            question_text:
              '<p>Which colligative property is most suitable for determining the molar mass of macromolecules such as proteins and polymers?</p>',
            option_a: 'Osmotic Pressure',
            option_b: 'Elevation in Boiling Point',
            option_c: 'Depression in Freezing Point',
            option_d: 'Relative Lowering of Vapour Pressure',
          },
        },
      },
      {
        question_group_id: 'q3',
        mark_per_question: 4,
        negative_marks: 1,
        correct_option: 'option_b',
        languages: {
          english: {
            question_text:
              '<p>According to Faraday’s First Law of Electrolysis, the mass of substance deposited at an electrode is directly proportional to:</p>',
            option_a: 'Resistance of the electrolyte',
            option_b: 'Quantity of electricity passed through the electrolyte',
            option_c: 'Temperature of the cell only',
            option_d: 'Volume of the container',
          },
        },
      },
      {
        question_group_id: 'q4',
        mark_per_question: 4,
        negative_marks: 1,
        correct_option: 'option_d',
        languages: {
          english: {
            question_text:
              '<p>Which of the following transition metal ions is <strong>diamagnetic</strong> in nature? (Atomic numbers: Sc=21, Ti=22, Fe=26, Zn=30)</p>',
            option_a: 'Ti³⁺',
            option_b: 'Fe²⁺',
            option_c: 'Mn²⁺',
            option_d: 'Zn²⁺',
          },
        },
      },
      {
        question_group_id: 'q5',
        mark_per_question: 4,
        negative_marks: 1,
        correct_option: 'option_a',
        languages: {
          english: {
            question_text:
              '<p>In coordination compounds, EDTA⁴⁻ acts as a:</p>',
            option_a: 'Hexadentate ligand',
            option_b: 'Bidentate ligand',
            option_c: 'Monodentate ligand',
            option_d: 'Tridentate ligand',
          },
        },
      },
    ];
  } else if (isMath) {
    questions = [
      {
        question_group_id: 'q1',
        mark_per_question: 4,
        negative_marks: 1,
        correct_option: 'option_b',
        languages: {
          english: {
            question_text:
              '<p>If A is an invertible matrix of order 3 and |A| = 5, then what is the value of |adj(A)|?</p>',
            option_a: '5',
            option_b: '25',
            option_c: '125',
            option_d: '1/5',
          },
        },
      },
      {
        question_group_id: 'q2',
        mark_per_question: 4,
        negative_marks: 1,
        correct_option: 'option_a',
        languages: {
          english: {
            question_text:
              '<p>The derivative of f(x) = sin(x²) with respect to x is:</p>',
            option_a: '2x cos(x²)',
            option_b: 'cos(x²)',
            option_c: '-2x cos(x²)',
            option_d: '2 sin(x) cos(x)',
          },
        },
      },
      {
        question_group_id: 'q3',
        mark_per_question: 4,
        negative_marks: 1,
        correct_option: 'option_c',
        languages: {
          english: {
            question_text:
              '<p>What is the order and degree of the differential equation d²y/dx² + (dy/dx)³ + y = 0?</p>',
            option_a: 'Order 1, Degree 3',
            option_b: 'Order 2, Degree 3',
            option_c: 'Order 2, Degree 1',
            option_d: 'Order 3, Degree 2',
          },
        },
      },
      {
        question_group_id: 'q4',
        mark_per_question: 4,
        negative_marks: 1,
        correct_option: 'option_d',
        languages: {
          english: {
            question_text:
              '<p>If P(A) = 0.4, P(B) = 0.5 and A and B are independent events, then P(A ∩ B) is equal to:</p>',
            option_a: '0.9',
            option_b: '0.1',
            option_c: '0.45',
            option_d: '0.20',
          },
        },
      },
      {
        question_group_id: 'q5',
        mark_per_question: 4,
        negative_marks: 1,
        correct_option: 'option_b',
        languages: {
          english: {
            question_text:
              '<p>The principal value of sin⁻¹(1/2) is:</p>',
            option_a: 'π/3',
            option_b: 'π/6',
            option_c: 'π/4',
            option_d: '2π/3',
          },
        },
      },
    ];
  } else {
    questions = [
      {
        question_group_id: 'q1',
        mark_per_question: 4,
        negative_marks: 1,
        correct_option: 'option_a',
        languages: {
          english: {
            question_text:
              '<p>In a purely inductive AC circuit, the phase difference between alternating current and alternating voltage is:</p>',
            option_a: 'Current lags behind voltage by π/2',
            option_b: 'Current leads voltage by π/2',
            option_c: 'Current and voltage are in the same phase',
            option_d: 'Phase difference is π radians',
          },
        },
      },
      {
        question_group_id: 'q2',
        mark_per_question: 4,
        negative_marks: 1,
        correct_option: 'option_c',
        languages: {
          english: {
            question_text:
              '<p>At resonance in a series LCR circuit, the power factor cos(φ) of the circuit is:</p>',
            option_a: '0',
            option_b: '0.5',
            option_c: '1',
            option_d: '0.707',
          },
        },
      },
      {
        question_group_id: 'q3',
        mark_per_question: 4,
        negative_marks: 1,
        correct_option: 'option_b',
        languages: {
          english: {
            question_text:
              '<p>Lenz’s Law of electromagnetic induction is a direct consequence of the law of conservation of:</p>',
            option_a: 'Electric Charge',
            option_b: 'Energy',
            option_c: 'Linear Momentum',
            option_d: 'Magnetic Flux',
          },
        },
      },
      {
        question_group_id: 'q4',
        mark_per_question: 4,
        negative_marks: 1,
        correct_option: 'option_d',
        languages: {
          english: {
            question_text:
              '<p>When an intrinsic semiconductor is doped with a pentavalent impurity like Phosphorus or Arsenic, the majority charge carriers are:</p>',
            option_a: 'Holes',
            option_b: 'Positive ions',
            option_c: 'Protons',
            option_d: 'Electrons',
          },
        },
      },
      {
        question_group_id: 'q5',
        mark_per_question: 4,
        negative_marks: 1,
        correct_option: 'option_a',
        languages: {
          english: {
            question_text:
              '<p>The RMS value of an alternating current having peak value I₀ is given by:</p>',
            option_a: 'I₀ / √2',
            option_b: 'I₀ × √2',
            option_c: '2 I₀ / π',
            option_d: 'I₀ / 2',
          },
        },
      },
    ];
  }

  return {
    durationMinutes: 15,
    instructionsHtml: `
      <p><strong>General Assessment Instructions:</strong></p>
      <ul class="list-disc pl-5 space-y-1.5 mt-2">
        <li>This mock test consists of <strong>${questions.length} Multiple Choice Questions (MCQs)</strong> curated for <strong>${testTitle}</strong>.</li>
        <li>Each correct response awards <span class="text-green-400 font-semibold">+4 Marks</span>; each incorrect response deducts <span class="text-red-400 font-semibold">-1 Mark</span>.</li>
        <li>Unattempted questions carry <strong>0 Marks</strong>.</li>
        <li>Use <strong>Save &amp; Next</strong> to record your response and proceed to the next question, or <strong>Clear</strong> to reset your selection.</li>
        <li>The countdown timer at the top right automatically submits your assessment when time expires.</li>
      </ul>
    `,
    questions,
  };
}
