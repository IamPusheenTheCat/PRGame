import { Punishment } from '../types/database';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY;

interface SuggestResult {
  punishment: Punishment;
  reason: string;
}

/**
 * 使用 DeepSeek AI 智能推荐惩罚
 */
export async function suggestPunishment(
  punishments: Punishment[],
  userMessage: string
): Promise<SuggestResult> {
  console.log('[DeepSeek] Starting AI suggestion...');
  console.log('[DeepSeek] API Key exists:', !!DEEPSEEK_API_KEY);
  console.log('[DeepSeek] Punishments count:', punishments.length);
  console.log('[DeepSeek] User message:', userMessage);

  if (!DEEPSEEK_API_KEY) {
    console.warn('[DeepSeek] No API key, falling back to random');
    return randomFallback(punishments);
  }

  const prompt = `
你是一个派对惩罚游戏的AI助手。有人迟到了，需要接受惩罚。

用户说：${userMessage}

可选的惩罚项目：
${punishments.map((p, i) => `${i + 1}. ${p.title}${p.description ? `（${p.description}）` : ''}`).join('\n')}

请根据用户的话，选择最合适的惩罚项目。返回 JSON 格式：
{
  "selected_index": 数字（从0开始的索引），
  "reason": "推荐理由（轻松有趣的语气，30字以内）"
}

只返回 JSON，不要其他内容。
`;

  try {
    console.log('[DeepSeek] Sending request...');
    
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
    });

    console.log('[DeepSeek] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[DeepSeek] API error:', errorText);
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('[DeepSeek] Response data:', JSON.stringify(data, null, 2));

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content in response');
    }

    // 尝试解析 JSON（处理可能的 markdown 代码块）
    let jsonStr = content;
    if (content.includes('```')) {
      jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    }
    
    const result = JSON.parse(jsonStr);
    console.log('[DeepSeek] Parsed result:', result);

    const selectedIndex = Math.max(0, Math.min(result.selected_index, punishments.length - 1));
    
    return {
      punishment: punishments[selectedIndex],
      reason: result.reason || 'AI 为你精心挑选的惩罚！',
    };
  } catch (error) {
    console.error('[DeepSeek] Error:', error);
    return randomFallback(punishments);
  }
}

function randomFallback(punishments: Punishment[]): SuggestResult {
  const index = Math.floor(Math.random() * punishments.length);
  return {
    punishment: punishments[index],
    reason: '随机抽取的惩罚，命运的安排！',
  };
}

/**
 * AI 生成的惩罚建议
 */
export interface AISuggestion {
  suggestion: string;
  reason: string;
}

/**
 * 用户画像信息
 */
export interface UserProfile {
  name: string;
  instruments: string[];
  onboardingResponse?: 'punctual' | 'late'; // 是否守时
  receivedPunishments: string[]; // 已收到的惩罚
  givenPunishments: string[]; // 给别人写的惩罚
  aiMessages: string[]; // 给AI写的希望收到的惩罚
}

// 乐器梗惩罚模板
const INSTRUMENT_JOKES: Record<string, string[]> = {
  // 吉他手
  'guitar': ['用贝斯弹一首歌', '不用失真效果弹整首歌', '用尤克里里代替电吉他'],
  '吉他': ['用贝斯弹一首歌', '不用失真效果弹整首歌', '用尤克里里代替电吉他'],
  '电吉他': ['用木吉他弹金属riff', '只用clean音色排练一次', '弹贝斯声部'],
  
  // 贝斯手
  'bass': ['弹吉他solo', '今天用拨片弹贝斯', '贝斯声部改用吉他弹'],
  '贝斯': ['弹吉他solo', '今天用拨片弹贝斯', '学一段slap'],
  
  // 鼓手
  'drum': ['只用一只鼓棒打完一首歌', '用刷子代替鼓棒', '换用非惯用手打军鼓和hi-hat'],
  '鼓': ['只用一只鼓棒打完一首歌', '用刷子代替鼓棒', '换用非惯用手打军鼓和hi-hat'],
  '架子鼓': ['不用镲排练一首', '只用底鼓和军鼓打一首', '站着打鼓'],
  
  // 主唱
  'vocal': ['用假音唱完一首歌', '模仿另一个歌手的唱腔', '不看歌词唱完一首'],
  '主唱': ['用假音唱完一首歌', '模仿周杰伦唱腔', '清唱一段无伴奏'],
  '人声': ['用超低音唱一首歌', '用rap方式唱抒情歌', '边跳边唱'],
  
  // 键盘
  'keyboard': ['只用左手弹伴奏', '不看键盘弹一首', '用口风琴代替键盘'],
  '键盘': ['只用左手弹伴奏', '不看键盘弹一首', '弹个爵士即兴'],
  '钢琴': ['用电子琴音色弹古典', '单手弹完一首', '弹贝斯声部'],
  
  // 通用音乐相关
  'music': ['唱一首其他成员的歌', '表演空气吉他solo', '用嘴模仿乐器声音'],
};

/**
 * 为目标用户生成个性化惩罚建议
 */
export async function generatePersonalizedSuggestions(
  profile: UserProfile,
  count: number = 3
): Promise<AISuggestion[]> {
  console.log('[DeepSeek] Generating personalized suggestions for:', profile.name);
  
  // 如果没有 API key，生成基于乐器的本地建议
  if (!DEEPSEEK_API_KEY) {
    console.warn('[DeepSeek] No API key, generating local suggestions');
    return generateLocalSuggestions(profile, count);
  }

  // 根据守时习惯调整惩罚强度
  const isLateHabit = profile.onboardingResponse === 'late';
  const severityNote = isLateHabit 
    ? `
⚠️ **特别注意：这个人自己承认经常迟到！**
既然TA是惯犯，可以给TA准备一些更"狠"、更有教训意义的惩罚：
- 惩罚可以更费时间/金钱一点
- 可以更尴尬一点（比如当众表演、发朋友圈道歉）
- 可以有"累犯加倍"的味道
但一定要个性化，尽量避免生成给谁都一样的惩罚（例如请所有人吃饭）
让TA感受到代价，下次才会准时！`
    : '';

  const prompt = `
你是一个乐队派对惩罚游戏的AI助手，要为迟到的成员生成有趣的惩罚建议。请发挥创意，特别是可以玩乐器梗！

## 目标用户：${profile.name}
- 乐器/角色：${profile.instruments.length > 0 ? profile.instruments.join(', ') : '普通成员'}
- 守时习惯：${isLateHabit ? '🚨 迟到惯犯！自己承认经常迟到' : profile.onboardingResponse === 'punctual' ? '认为自己守时' : '未知'}
${severityNote}

## 已收到的惩罚（避免重复）
${profile.receivedPunishments.length > 0 ? profile.receivedPunishments.map(p => `- ${p}`).join('\n') : '暂无'}

## TA给别人写的惩罚（可以"以彼之道还施彼身"）
${profile.givenPunishments.length > 0 ? profile.givenPunishments.map(p => `- ${p}`).join('\n') : '暂无'}

## TA对AI说过希望收到的惩罚
${profile.aiMessages.length > 0 ? profile.aiMessages.map(m => `- "${m}"`).join('\n') : '暂无'}

## 重要要求
1. **必须生成 ${count} 个建议，不能为空！**
2. 如果有乐器信息，一定要玩乐器梗！例如：
   - 吉他手："用贝斯弹一首歌" / "不开失真效果弹完一首"
   - 鼓手："只用一只鼓棒打完一首" / "站着打鼓"  
   - 主唱："用假音唱完一首" / "模仿周杰伦唱腔"
   - 贝斯手："弹吉他solo" / "今天用拨片"
3. 如果用户给别人写过狠的惩罚，让TA也尝尝
4. 避免与已收到的惩罚重复
5. 每个建议20字以内，理由15字以内
${isLateHabit ? '6. **这是迟到惯犯，惩罚可以重一点！**' : '6. 惩罚应该有趣、适合朋友间玩乐'}

请返回 JSON 格式：
{
  "suggestions": [
    {"suggestion": "惩罚内容", "reason": "为什么适合TA"},
    {"suggestion": "惩罚内容", "reason": "为什么适合TA"},
    {"suggestion": "惩罚内容", "reason": "为什么适合TA"}
  ]
}

只返回 JSON，不要其他内容。必须返回 ${count} 个建议！
`;

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9, // 更高的温度让建议更有创意
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in response');
    }

    // 解析 JSON
    let jsonStr = content;
    if (content.includes('```')) {
      jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    }
    
    const result = JSON.parse(jsonStr);
    console.log('[DeepSeek] Generated suggestions:', result);
    
    // 如果 AI 返回为空，使用本地建议
    if (!result.suggestions || result.suggestions.length === 0) {
      return generateLocalSuggestions(profile, count);
    }
    
    return result.suggestions;
  } catch (error) {
    console.error('[DeepSeek] Error generating suggestions:', error);
    // 失败时使用本地建议
    return generateLocalSuggestions(profile, count);
  }
}

/**
 * 生成基于乐器的本地建议（当 AI 不可用时）
 */
function generateLocalSuggestions(profile: UserProfile, count: number): AISuggestion[] {
  const suggestions: AISuggestion[] = [];
  const usedSuggestions = new Set<string>();
  
  // 1. 首先尝试根据乐器生成建议
  for (const instrument of profile.instruments) {
    const key = instrument.toLowerCase();
    for (const [jokeKey, jokes] of Object.entries(INSTRUMENT_JOKES)) {
      if (key.includes(jokeKey) || jokeKey.includes(key)) {
        for (const joke of jokes) {
          if (!usedSuggestions.has(joke) && suggestions.length < count) {
            suggestions.push({
              suggestion: joke,
              reason: `${instrument}专属惩罚`,
            });
            usedSuggestions.add(joke);
          }
        }
      }
    }
  }
  
  // 2. 如果给别人写过惩罚，可以反过来
  if (profile.givenPunishments.length > 0 && suggestions.length < count) {
    const randomPunishment = profile.givenPunishments[Math.floor(Math.random() * profile.givenPunishments.length)];
    if (!profile.receivedPunishments.includes(randomPunishment)) {
      suggestions.push({
        suggestion: randomPunishment,
        reason: '以彼之道还施彼身',
      });
    }
  }
  
  // 3. 通用音乐惩罚
  const genericMusicPunishments = [
    { suggestion: '表演空气吉他solo', reason: '每个人都可以摇滚' },
    { suggestion: '用嘴模仿三种乐器声音', reason: '展示你的beat box技能' },
    { suggestion: '唱一首歌的副歌（不能是你熟悉的歌）', reason: '挑战自我' },
    { suggestion: '给大家表演一段舞蹈', reason: '音乐不止是听的' },
    { suggestion: '请所有人喝奶茶', reason: '经典惩罚永不过时' },
    { suggestion: '下次排练必须第一个到', reason: '知错能改善莫大焉' },
  ];
  
  for (const punishment of genericMusicPunishments) {
    if (suggestions.length >= count) break;
    if (!usedSuggestions.has(punishment.suggestion) && 
        !profile.receivedPunishments.includes(punishment.suggestion)) {
      suggestions.push(punishment);
      usedSuggestions.add(punishment.suggestion);
    }
  }
  
  return suggestions.slice(0, count);
}

