<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {        
        $categories = \App\Models\Category::factory()->count(8)->create();

        \App\Models\Card::factory()
            ->count(50)
            ->create()
            ->each(function ($card) use ($categories) {
                $card->categories()->attach(
                    $categories->random(rand(0, 3))->pluck('id')->unique()->toArray()
                );
            });
    }
}
