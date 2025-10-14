<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Ranking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RankingController extends Controller
{
    public function getRanking(Ranking $ranking)
    {

        $ranking->load([
            'cards' => fn($q) => $q->orderBy('ranking_cards.placement'),
            'cards.categories',
        ]);

        return response()->json($ranking);
    }

    public function getRankings(Request $request)
    {
        $search = $request->input('search');

        $query = Ranking::query();

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        return response()->json($query->orderByDesc('created_at')->get());
    }

    public function addRanking(Request $request)
    {
        $filtersPayload = $this->normalizeFilters($request->input('filters'));

        $ranking = Ranking::create([
            'name'        => $request->input('name'),
            'description' => $request->input('description'),
            'tiers'       => $request->input('tiers'),
            'image_url'   => $request->input('image_url'),
            'filters'     => $filtersPayload,
        ]);

        $items = $request->input('items', []);
        if (!empty($items)) {
            $ranking->cards()->sync($this->toSyncArray($items));
        }

        $ranking->load([
            'cards' => fn($q) => $q->orderBy('ranking_cards.placement'),
            'cards.categories',
        ]);

        return response()->json($ranking);
    }

    public function editRanking(Request $request, Ranking $ranking)
    {
        if ($request->has('name')) {
            $ranking->name = $request->input('name');
        }
        if ($request->has('description')) {
            $ranking->description = $request->input('description');
        }
        if ($request->has('image_url')) {
            $ranking->image_url = $request->input('image_url');
        }
        if ($request->has('tiers')) {
            $ranking->tiers = $request->input('tiers');
        }
        if ($request->has('filters')) {
            $ranking->filters = $this->normalizeFilters($request->input('filters'));
        }

        $ranking->save();

        if ($request->has('items')) {
            $ranking->cards()->sync($this->toSyncArray($request->input('items', [])));
        }

        $ranking->load([
            'cards' => fn($q) => $q->orderBy('ranking_cards.placement'),
            'cards.categories',
        ]);

        return response()->json($ranking);
    }

    public function deleteRanking(Ranking $ranking)
    {
        $ranking->cards()->detach();
        $ranking->delete();

        return response()->json(['ok' => true]);
    }

    protected function normalizeFilters($filters): ?string
    {
        if (is_null($filters)) {
            return null;
        }

        if (is_string($filters)) {
            $trimmed = trim($filters);
            return $trimmed === '' ? null : $trimmed;
        }

        return json_encode($filters, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    protected function toSyncArray(array $items): array
    {
        $payload = [];
        foreach ($items as $row) {
            if (isset($row['card_id'], $row['placement'])) {
                $payload[$row['card_id']] = ['placement' => (int) $row['placement']];
            }
        }
        return $payload;
    }


    public function syncRankingCards(Request $request, Ranking $ranking)
    {
        $items = $request->input('items', []);

        // Normalize into sync payload: [ card_id => ['placement' => n, 'tier' => 'S' ], ... ]
        $payload = $this->toSyncArrayWithTier($items);

        DB::transaction(function () use ($ranking, $payload) {
            $ranking->cards()->sync($payload);
        });

        // Return fresh snapshot ordered by placement, including categories and pivot
        $ranking->load([
            'cards' => function ($q) {
                $q->orderBy('ranking_cards.placement');
            },
            'cards.categories',
        ]);

        return response()->json($ranking);
    }

    /** Convert [{card_id, placement, tier}] -> [ card_id => ['placement'=>..., 'tier'=>...], ... ] */
    protected function toSyncArrayWithTier(array $items): array
    {
        $payload = [];
        $auto = 1;

        foreach ($items as $row) {
            $cardId    = (int)($row['card_id'] ?? 0);
            if ($cardId <= 0) continue;

            // If placement is missing, auto-increment in incoming order
            $placement = isset($row['placement']) ? (int)$row['placement'] : $auto++;
            $tier      = isset($row['tier']) ? (string)$row['tier'] : null;

            $payload[$cardId] = [
                'placement' => $placement,
                'tier'      => $tier,
            ];
        }

        return $payload;
    }
}
