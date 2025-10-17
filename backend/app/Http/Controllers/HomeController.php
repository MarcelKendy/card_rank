<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\RankingCard;
use App\Models\Card;

class HomeController extends Controller
{
    /**
     * Top cards by average placement across all rankings.
     * Optional filter: ?category_id=ID -> only include cards that have this category.
     * Response includes:
     * - numeric avg_placement, appearances
     * - card fields (id, name, image_url, description, rating)
     * - categories: [{ id, name, color }]
     * - rankings: [{ id, name, placement }]
     */
    public function getBestRankedCards(Request $request)
    {
        $limit = 10; // keep your previous limit
        $categoryId = $request->integer('category_id'); // null if missing

        // 1) Aggregate per card (optionally filter by card->categories)
        $top = RankingCard::query()
            ->select(
                'card_id',
                DB::raw('AVG(placement) as avg_placement'),
                DB::raw('COUNT(*) as appearances')
            )
            ->when($categoryId, function ($q) use ($categoryId) {
                // RankingCard -> card (belongsTo) -> categories (belongsToMany)
                $q->whereHas('card.categories', function ($cq) use ($categoryId) {
                    $cq->where('categories.id', $categoryId);
                });
            })
            ->groupBy('card_id')
            ->orderBy('avg_placement') // lower is better
            ->limit($limit)
            ->get();

        if ($top->isEmpty()) {
            return response()->json([]);
        }

        $cardIds = $top->pluck('card_id')->all();

        // 2) Eager-load cards with categories and the rankings they appear in (with placement)
        //    Card has: categories() and rankingCards()->belongsTo(Ranking)
        $cards = Card::query()
            ->with([
                'categories:id,name,color',
                'rankingCards.ranking:id,name', // we need ranking name and placement (placement is on ranking_cards)
            ])
            ->whereIn('id', $cardIds)
            ->get()
            ->keyBy('id');

        // 3) Build response preserving order from $top
        $out = $top->map(function ($row) use ($cards) {
            $card = $cards->get($row->card_id);
            if (!$card) return null;

            $avg = (float) $row->avg_placement;
            $apps = (int) $row->appearances;

            // Map rankingCards to id, name, placement
            $ranks = $card->rankingCards->map(function ($rc) {
                return [
                    'id'        => (int) ($rc->ranking->id ?? 0),
                    'name'      => (string) ($rc->ranking->name ?? ''),
                    'placement' => (int) $rc->placement,
                ];
            })->values();

            return [
                'card_id'       => (int) $row->card_id,
                'avg_placement' => $avg,
                'appearances'   => $apps,

                // flattened card fields (preserve full image_url string)
                'id'          => (int) $card->id,
                'name'        => (string) $card->name,
                'image_url'   => (string) ($card->image_url ?? ''),
                'description' => $card->description ?? null,
                'rating'      => $card->rating ?? null,

                // categories for CardMini/CardTile
                'categories' => $card->categories->map(function ($c) {
                    return [
                        'id'    => (int) $c->id,
                        'name'  => (string) $c->name,
                        'color' => $c->color ?? null,
                    ];
                })->values(),

                // rankings with placement for chips/avatars
                'rankings' => $ranks,
            ];
        })->filter()->values();

        return response()->json($out);
    }
}
